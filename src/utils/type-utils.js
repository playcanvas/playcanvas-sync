import path from 'path';

const TEXTUAL_ASSET_TYPES = [
    'text',
    'script',
    'css',
    'html',
    'json',
    'shader'
];

const TYPE_TO_EXT = {
    'script': ['.js', '.mjs'],
    'scene': ['.fbx', '.dae', '.obj', '.3ds'],
    'text': ['.txt', '.xml', '.atlas'],
    'html': ['.html'],
    'css': ['.css'],
    'json': ['.json'],
    'texture': ['.tif', '.tga', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.dds', '.hdr', '.exr'],
    'audio': ['.wav', '.mp3', '.mp4', '.ogg', '.m4a'],
    'shader': ['.glsl', '.frag', '.vert'],
    'font': ['.ttf', '.otf', '.ttc', '.dfont'],
    'wasm': ['.wasm']
};

const TEXTUAL_EXTENSIONS = {};

TEXTUAL_ASSET_TYPES.forEach((t) => {
    const a = TYPE_TO_EXT[t];

    a.forEach((ext) => {
        TEXTUAL_EXTENSIONS[ext] = 1;
    });
});

const CONFIG_FILES = ['pcconfig.json', '.pcconfig'];

const TypeUtils = {
    isBadFile: function (name, remotePath, conf) {
        if (CONFIG_FILES.includes(name)) {
            return true;
        }
        return TypeUtils.hasForceReg(conf) ?
            !TypeUtils.isForceFile(remotePath, conf) :
            TypeUtils.isBadTextual(name, remotePath, conf);
    },

    isBadTextual: function (name, remotePath, conf) {
        return conf.PLAYCANVAS_BAD_FILE_REG.test(name) ||
        !TypeUtils.isTextualFile(name) ||
        !conf.ignParser.isMatch(remotePath);
    },

    isActiveAsset: function (h, conf) {
        return TypeUtils.hasForceReg(conf) ?
            TypeUtils.isForceFile(h.remotePath, conf) :
            TypeUtils.isActiveTextual(h, conf);
    },

    isActiveTextual: function (h, conf) {
        return TypeUtils.isTextualType(h.type) &&
        TypeUtils.isTextualFile(h.name) &&
        conf.ignParser.isMatch(h.remotePath);
    },

    isTextualType: function (t) {
        return TEXTUAL_ASSET_TYPES.includes(t);
    },

    isTextualFile: function (s) {
        const ext = path.extname(s).toLowerCase();  // Uppercase to lowercase to avoid case sensitivity

        return TEXTUAL_EXTENSIONS[ext];
    },

    hasForceReg: function (conf) {
        return conf.PLAYCANVAS_FORCE_REG;
    },

    isForceFile: function (remotePath, conf) {
        return conf.PLAYCANVAS_FORCE_REG.test(remotePath);
    }
};

export default TypeUtils;
