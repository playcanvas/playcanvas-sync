const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const Bottleneck = require('bottleneck');

const CUtils = require('./utils/common-utils.js');

const MAX_CONCURRENT = 10;
const MINUTE_INTERVAL = 60 * 1000;

const ASSETS_PREF = '/api';
const EDITOR_PREF = '/editor';

class ApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;

        this.apiKey = apiKey;

        this.headers = {
            Authorization: `Bearer ${apiKey}`
        };

        // Create Bottleneck limiters
        this.limiterDownload = null;
        this.limiterUpload = null;
        this.limiterApi = null;
        this.limits = null;

        CUtils.checkHttps(baseUrl);
    }

    async _fetch(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: { ...this.headers, ...options.headers }
        });

        if (!response.ok) {
            const error = new Error(`HTTP ${response.status}`);
            error.statusCode = response.status;
            throw error;
        }

        return response;
    }

    _objectToFormData(data) {
        const formData = new FormData();

        for (const [key, value] of Object.entries(data)) {
            if (value && typeof value.pipe === 'function' && value.path) {
                const buffer = fs.readFileSync(value.path);
                const filename = path.basename(value.path);
                formData.append(key, new Blob([buffer]), filename);
            } else if (value !== undefined && value !== null) {
                formData.append(key, String(value));
            }
        }

        return formData;
    }

    getDownloadLimiter() {
        if (!this.limiterDownload) {
            this.limiterDownload = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: this.limits.download * 2, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: this.limits.download, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterDownload;
    }

    getUploadLimiter() {
        if (!this.limiterUpload) {
            this.limiterUpload = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: this.limits.assets, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: this.limits.assets, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterUpload;
    }

    getApiLimiter() {
        if (!this.limiterApi) {
            this.limiterApi = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: this.limits.normal, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: this.limits.normal, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterApi;
    }

    postForm(url, data) {
        url = this.assetsUrl(url);

        const limiter = this.getUploadLimiter();

        return limiter.schedule(async () => {
            const formData = this._objectToFormData(data);
            const response = await this._fetch(url, {
                method: 'POST',
                body: formData
            });
            return response.text();
        });
    }

    putForm(url, data) {
        url = this.assetsUrl(url);

        const limiter = this.getUploadLimiter();

        return limiter.schedule(async () => {
            const formData = this._objectToFormData(data);
            const response = await this._fetch(url, {
                method: 'PUT',
                body: formData
            });
            return response.text();
        });
    }

    methodDelete(url) {
        url = this.assetsUrl(url);

        const limiter = this.getApiLimiter();

        return limiter.schedule(async () => {
            const response = await this._fetch(url, {
                method: 'DELETE'
            });
            return response.text();
        });
    }

    async methodGet(url, pref, addToken) {
        url = this.fullUrl(url, pref);

        if (addToken) {
            url = `${url}?access_token=${this.apiKey}`;
        }

        const response = await this._fetch(url);
        return response.text();
    }

    async methodPost(url, pref, addToken, payload) {
        url = this.fullUrl(url, pref);

        if (addToken) {
            url = `${url}?access_token=${this.apiKey}`;
        }

        const response = await this._fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    }

    assetsUrl(s) {
        return this.fullUrl(s, ASSETS_PREF);
    }

    fullUrl(s, pref) {
        s = [this.baseUrl, pref, s].join('');

        return encodeURI(s);
    }

    loadAssetToFile(h, conf) {
        const file = CUtils.assetToFullPath(h, conf);

        const limiter = this.getDownloadLimiter();

        return limiter.schedule({ }, async () => {
            const stream = await this.makeDownloadStream(h, conf.PLAYCANVAS_BRANCH_ID);
            return CUtils.streamToFile(stream, file);
        });
    }

    async loadAssetToStr(asset, branchId) {
        const stream = await this.makeDownloadStream(asset, branchId);

        return CUtils.streamToString(stream);
    }

    async makeDownloadStream(asset, branchId) {
        const name = asset.file.filename;

        const s = `/assets/${asset.id}/file/${name}?branchId=${branchId}`;

        const url = this.assetsUrl(s);

        const response = await this._fetch(url);
        return Readable.fromWeb(response.body);
    }

    async fetchLimits(projectId, branchId, skip, limit) {
        const url = '/ratelimits';
        const resp = await this.methodGet(url, ASSETS_PREF, false);

        this.limits = (JSON.parse(resp)).limits;
        return this.limits;
    }

    async fetchAssets(projectId, branchId, skip, limit) {
        const url = `/projects/${projectId}/assets?` +
      `branchId=${branchId}&` +
      `skip=${skip}&limit=${limit}`;

        const resp = await this.methodGet(url, ASSETS_PREF, false);

        return JSON.parse(resp);
    }

    async getCurEditorBranch(projectId) {
        const url = `/project/${projectId}/branch`;

        const resp = await this.methodGet(url, EDITOR_PREF, true);

        return JSON.parse(resp);
    }
}

module.exports = ApiClient;
