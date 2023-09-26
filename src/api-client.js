const request = require('request-promise-native');
const CUtils = require('./utils/common-utils');
const Bottleneck = require('bottleneck');

const API_RATE_LIMIT_DOWNLOAD = 5000;

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

        // Create a Bottleneck limiters
        this.limiterDownload = null;
        this.limiterUpload = null;
        this.limiterApi = null;
        this.limits = null;

        CUtils.checkHttps(baseUrl);
    }

    createDownloadLimiter() {
        if (!this.limiterDownload) {
            this.limiterDownload = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: API_RATE_LIMIT_DOWNLOAD * 2, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: API_RATE_LIMIT_DOWNLOAD, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterDownload;
    }

    createUploadLimiter() {
        if (!this.limiterUpload) {
            this.limiterUpload = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: this.limits.assets * 2, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: this.limits.assets, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterUpload;
    }

    createApiLimiter() {
        if (!this.limiterApi) {
            this.limiterApi = new Bottleneck({
                maxConcurrent: MAX_CONCURRENT, // Max concurrent requests (if tokens)
                reservoir: this.limits.normal * 2, // Initial number of tokens in the reservoir
                reservoirRefreshAmount: this.limits.normal, // Number of tokens added to the reservoir every minute
                reservoirRefreshInterval: MINUTE_INTERVAL // Interval to add tokens to the reservoir (1 minute)
            });
        }

        return this.limiterApi;
    }

    postForm(url, data) {
        url = this.assetsUrl(url);

        const limiter = this.createUploadLimiter();

        return limiter.schedule(() => {
            return request.post({
                url: url,
                formData: data,
                headers: this.headers
            });
        });
    }

    putForm(url, data) {
        url = this.assetsUrl(url);

        const limiter = this.createUploadLimiter();

        return limiter.schedule(() => {
            return request.put(url, {
                formData: data,
                headers: this.headers
            });
        });
    }

    methodDelete(url) {
        url = this.assetsUrl(url);

        const limiter = this.createApiLimiter();

        return limiter.schedule(() => {
            return request.delete(url, {
                headers: this.headers
            });
        });
    }

    methodGet(url, pref, addToken) {
        url = this.fullUrl(url, pref);

        if (addToken) {
            url = `${url}?access_token=${this.apiKey}`;
        }

        return request({
            url: url,
            headers: this.headers
        });
    }

    methodPost(url, pref, addToken, payload) {
        url = this.fullUrl(url, pref);

        if (addToken) {
            url = `${url}?access_token=${this.apiKey}`;
        }

        return request({
            method: 'POST',
            url: url,
            headers: this.headers,
            body: payload,
            json: true
        });
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

        const limiter = this.createDownloadLimiter();

        return limiter.schedule({ }, () => {
            const stream = this.makeDownloadStream(h, conf.PLAYCANVAS_BRANCH_ID);
            return CUtils.streamToFile(stream, file);
        });
    }

    loadAssetToStr(asset, branchId) {
        const stream = this.makeDownloadStream(asset, branchId);

        return CUtils.streamToString(stream);
    }

    makeDownloadStream(asset, branchId) {
        const name = asset.file.filename;

        const s = `/assets/${asset.id}/file/${name}?branchId=${branchId}`;

        const url = this.assetsUrl(s);

        return request({
            url: url,
            headers: this.headers
        });
    }

    async fetchLimits(projectId, branchId, skip, limit) {
        const url = `/ratelimits`;
        const resp = await this.methodGet(url, ASSETS_PREF, false);

        this.limits = JSON.parse(resp);
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

    async getEditorBranches(projectId) {
        const url = `/projects/${projectId}/branches`;

        const branches = [];
        let hasMore = true;
        let branchId;

        while (hasMore) {
            const resp = await this.methodGet(
                url + (branchId ? "skip=" + branchId : ""),
                BRANCHES_PREF,
                true
            );

            const respData = JSON.parse(resp);

            hasMore = respData.pagination.hasMore;

            branches.push(...respData.result);

            branchId = respData.result[respData.result.length - 1].id;
        }

        return branches;
    }
}

module.exports = ApiClient;
