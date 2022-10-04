const request = require('request-promise-native');
const CUtils = require('./utils/common-utils');

const ASSETS_PREF = '/api';
const EDITOR_PREF = '/editor';

class ApiClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;

        this.apiKey = apiKey;

        this.headers = {
            Authorization: `Bearer ${apiKey}`
        };

        CUtils.checkHttps(baseUrl);
    }

    postForm(url, data) {
        url = this.assetsUrl(url);

        return request.post({
            url: url,
            formData: data,
            headers: this.headers
        });
    }

    putForm(url, data) {
        url = this.assetsUrl(url);

        return request.put(url, {
            formData: data,
            headers: this.headers
        });
    }

    methodDelete(url) {
        url = this.assetsUrl(url);

        return request.delete(url, {
            headers: this.headers
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

    assetsUrl(s) {
        return this.fullUrl(s, ASSETS_PREF);
    }

    fullUrl(s, pref) {
        s = [this.baseUrl, pref, s].join('');

        return encodeURI(s);
    }

    loadAssetToFile(h, conf) {
        const file = CUtils.assetToFullPath(h, conf);

        const stream = this.makeDownloadStream(h, conf.PLAYCANVAS_BRANCH_ID);

        return CUtils.streamToFile(stream, file);
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
