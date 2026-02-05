import { expect } from 'chai';
import nock from 'nock';
import ApiClient from '../../src/api-client.js';

describe('ApiClient', function () {
    const BASE_URL = 'https://playcanvas.com';
    const API_KEY = 'test-api-key';
    let client;

    beforeEach(function () {
        client = new ApiClient(BASE_URL, API_KEY);
        // Set up default limits for rate limiting
        client.limits = {
            normal: 100,
            download: 100,
            assets: 100
        };
    });

    afterEach(function () {
        nock.cleanAll();
    });

    describe('constructor', function () {
        it('should initialize with base URL and API key', function () {
            expect(client.baseUrl).to.equal(BASE_URL);
            expect(client.apiKey).to.equal(API_KEY);
        });

        it('should set authorization header', function () {
            expect(client.headers.Authorization).to.equal(`Bearer ${API_KEY}`);
        });

        it('should throw for non-https URL', function () {
            expect(() => new ApiClient('http://playcanvas.com', API_KEY)).to.throw();
        });

        it('should initialize limiters as null', function () {
            expect(client.limiterDownload).to.be.null;
            expect(client.limiterUpload).to.be.null;
            expect(client.limiterApi).to.be.null;
        });
    });

    describe('#fullUrl', function () {
        it('should combine base URL, prefix, and path', function () {
            const result = client.fullUrl('/test', '/api');
            expect(result).to.equal('https://playcanvas.com/api/test');
        });

        it('should encode URI characters', function () {
            const result = client.fullUrl('/path with spaces', '/api');
            expect(result).to.equal('https://playcanvas.com/api/path%20with%20spaces');
        });
    });

    describe('#assetsUrl', function () {
        it('should use /api prefix', function () {
            const result = client.assetsUrl('/assets/123');
            expect(result).to.equal('https://playcanvas.com/api/assets/123');
        });
    });

    describe('#fetchLimits', function () {
        it('should fetch and store rate limits', async function () {
            const limitsResponse = {
                limits: {
                    normal: 200,
                    download: 500,
                    assets: 100
                }
            };

            nock(BASE_URL)
            .get('/api/ratelimits')
            .reply(200, JSON.stringify(limitsResponse));

            const result = await client.fetchLimits();

            expect(result).to.deep.equal(limitsResponse.limits);
            expect(client.limits).to.deep.equal(limitsResponse.limits);
        });

        it('should include authorization header', async function () {
            nock(BASE_URL)
            .get('/api/ratelimits')
            .matchHeader('Authorization', `Bearer ${API_KEY}`)
            .reply(200, JSON.stringify({ limits: { normal: 100, download: 100, assets: 100 } }));

            await client.fetchLimits();
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#fetchAssets', function () {
        it('should fetch assets list with correct parameters', async function () {
            const projectId = 12345;
            const branchId = 'main-branch-id';
            const skip = 0;
            const limit = 100;

            const assetsResponse = {
                result: [
                    { id: 1, name: 'asset1.js', type: 'script' },
                    { id: 2, name: 'asset2.js', type: 'script' }
                ],
                pagination: { total: 2 }
            };

            nock(BASE_URL)
            .get(`/api/projects/${projectId}/assets`)
            .query({
                branchId: branchId,
                skip: skip.toString(),
                limit: limit.toString()
            })
            .reply(200, JSON.stringify(assetsResponse));

            const result = await client.fetchAssets(projectId, branchId, skip, limit);

            expect(result).to.deep.equal(assetsResponse);
        });

        it('should handle empty assets response', async function () {
            const projectId = 12345;
            const branchId = 'main-branch-id';

            nock(BASE_URL)
            .get(`/api/projects/${projectId}/assets`)
            .query(true)
            .reply(200, JSON.stringify({ result: [], pagination: { total: 0 } }));

            const result = await client.fetchAssets(projectId, branchId, 0, 100);

            expect(result.result).to.deep.equal([]);
        });
    });

    describe('#getCurEditorBranch', function () {
        it('should fetch current editor branch', async function () {
            const projectId = 12345;
            const branchResponse = {
                id: 'branch-123',
                name: 'main'
            };

            nock(BASE_URL)
            .get(`/editor/project/${projectId}/branch`)
            .query({ access_token: API_KEY })
            .reply(200, JSON.stringify(branchResponse));

            const result = await client.getCurEditorBranch(projectId);

            expect(result).to.deep.equal(branchResponse);
        });

        it('should add access_token to query string', async function () {
            const projectId = 12345;

            nock(BASE_URL)
            .get(`/editor/project/${projectId}/branch`)
            .query(query => query.access_token === API_KEY)
            .reply(200, JSON.stringify({ id: 'branch-123' }));

            await client.getCurEditorBranch(projectId);
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#postForm', function () {
        it('should post form data to assets API', async function () {
            const url = '/assets';
            const formData = { name: 'test.js', file: 'content' };

            nock(BASE_URL)
            .post('/api/assets')
            .reply(200, JSON.stringify({ id: 123 }));

            const result = await client.postForm(url, formData);

            expect(JSON.parse(result)).to.deep.equal({ id: 123 });
        });

        it('should include authorization header', async function () {
            nock(BASE_URL)
            .post('/api/assets')
            .matchHeader('Authorization', `Bearer ${API_KEY}`)
            .reply(200, JSON.stringify({ success: true }));

            await client.postForm('/assets', {});
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#putForm', function () {
        it('should put form data to assets API', async function () {
            const url = '/assets/123';
            const formData = { name: 'updated.js' };

            nock(BASE_URL)
            .put('/api/assets/123')
            .reply(200, JSON.stringify({ id: 123, name: 'updated.js' }));

            const result = await client.putForm(url, formData);

            expect(JSON.parse(result)).to.have.property('name', 'updated.js');
        });

        it('should include authorization header', async function () {
            nock(BASE_URL)
            .put('/api/assets/123')
            .matchHeader('Authorization', `Bearer ${API_KEY}`)
            .reply(200, JSON.stringify({ success: true }));

            await client.putForm('/assets/123', {});
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#methodDelete', function () {
        it('should send delete request to assets API', async function () {
            const url = '/assets/123';

            nock(BASE_URL)
            .delete('/api/assets/123')
            .reply(200, JSON.stringify({ success: true }));

            const result = await client.methodDelete(url);

            expect(JSON.parse(result)).to.deep.equal({ success: true });
        });

        it('should include authorization header', async function () {
            nock(BASE_URL)
            .delete('/api/assets/123')
            .matchHeader('Authorization', `Bearer ${API_KEY}`)
            .reply(200, JSON.stringify({ success: true }));

            await client.methodDelete('/assets/123');
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#methodGet', function () {
        it('should make GET request with prefix', async function () {
            nock(BASE_URL)
            .get('/api/test')
            .reply(200, 'response');

            const result = await client.methodGet('/test', '/api', false);

            expect(result).to.equal('response');
        });

        it('should add access_token when addToken is true', async function () {
            nock(BASE_URL)
            .get('/api/test')
            .query({ access_token: API_KEY })
            .reply(200, 'response');

            await client.methodGet('/test', '/api', true);
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('#methodPost', function () {
        it('should make POST request with JSON body', async function () {
            const payload = { data: 'test' };

            nock(BASE_URL)
            .post('/api/test', payload)
            .reply(200, { success: true });

            const result = await client.methodPost('/test', '/api', false, payload);

            expect(result).to.deep.equal({ success: true });
        });

        it('should add access_token when addToken is true', async function () {
            nock(BASE_URL)
            .post('/api/test')
            .query({ access_token: API_KEY })
            .reply(200, { success: true });

            await client.methodPost('/test', '/api', true, {});
            expect(nock.isDone()).to.be.true;
        });
    });

    describe('rate limiters', function () {
        it('should create download limiter lazily', function () {
            expect(client.limiterDownload).to.be.null;
            const limiter = client.getDownloadLimiter();
            expect(limiter).to.not.be.null;
            expect(client.limiterDownload).to.equal(limiter);
        });

        it('should return same download limiter on subsequent calls', function () {
            const limiter1 = client.getDownloadLimiter();
            const limiter2 = client.getDownloadLimiter();
            expect(limiter1).to.equal(limiter2);
        });

        it('should create upload limiter lazily', function () {
            expect(client.limiterUpload).to.be.null;
            const limiter = client.getUploadLimiter();
            expect(limiter).to.not.be.null;
            expect(client.limiterUpload).to.equal(limiter);
        });

        it('should return same upload limiter on subsequent calls', function () {
            const limiter1 = client.getUploadLimiter();
            const limiter2 = client.getUploadLimiter();
            expect(limiter1).to.equal(limiter2);
        });

        it('should create API limiter lazily', function () {
            expect(client.limiterApi).to.be.null;
            const limiter = client.getApiLimiter();
            expect(limiter).to.not.be.null;
            expect(client.limiterApi).to.equal(limiter);
        });

        it('should return same API limiter on subsequent calls', function () {
            const limiter1 = client.getApiLimiter();
            const limiter2 = client.getApiLimiter();
            expect(limiter1).to.equal(limiter2);
        });
    });

    describe('error handling', function () {
        it('should throw on 404 response', async function () {
            nock(BASE_URL)
            .get('/api/projects/999/assets')
            .query(true)
            .reply(404, { error: 'Not found' });

            try {
                await client.fetchAssets(999, 'branch', 0, 100);
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error.statusCode).to.equal(404);
            }
        });

        it('should throw on 401 unauthorized', async function () {
            nock(BASE_URL)
            .get('/api/ratelimits')
            .reply(401, { error: 'Unauthorized' });

            try {
                await client.fetchLimits();
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error.statusCode).to.equal(401);
            }
        });

        it('should throw on 500 server error', async function () {
            nock(BASE_URL)
            .get('/api/ratelimits')
            .reply(500, { error: 'Internal server error' });

            try {
                await client.fetchLimits();
                expect.fail('Should have thrown');
            } catch (error) {
                expect(error.statusCode).to.equal(500);
            }
        });
    });

    describe('#loadAssetToStr', function () {
        it('should download asset content as string', async function () {
            const asset = {
                id: 123,
                file: { filename: 'script.js' }
            };
            const branchId = 'branch-123';
            const fileContent = 'console.log("hello");';

            nock(BASE_URL)
            .get(`/api/assets/${asset.id}/file/${asset.file.filename}`)
            .query({ branchId: branchId })
            .reply(200, fileContent);

            const result = await client.loadAssetToStr(asset, branchId);

            expect(result).to.equal(fileContent);
        });

        it('should encode special characters in filename', async function () {
            const asset = {
                id: 123,
                file: { filename: 'my script.js' }
            };
            const branchId = 'branch-123';

            nock(BASE_URL)
            .get('/api/assets/123/file/my%20script.js')
            .query({ branchId: branchId })
            .reply(200, 'content');

            const result = await client.loadAssetToStr(asset, branchId);

            expect(result).to.equal('content');
        });
    });

    describe('#makeDownloadStream', function () {
        it('should create download stream with correct URL', async function () {
            const asset = {
                id: 456,
                file: { filename: 'texture.png' }
            };
            const branchId = 'branch-abc';

            nock(BASE_URL)
            .get(`/api/assets/${asset.id}/file/${asset.file.filename}`)
            .query({ branchId: branchId })
            .reply(200, 'binary-content');

            // makeDownloadStream returns a promise that resolves to a Node.js Readable
            const stream = await client.makeDownloadStream(asset, branchId);

            // Consume the stream using events
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const data = Buffer.concat(chunks).toString('utf8');
            expect(data).to.equal('binary-content');
        });
    });

});
