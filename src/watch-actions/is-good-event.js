const path = require('path');
const CUtils = require('../utils/common-utils');
const TypeUtils = require('../utils/type-utils');
const PathUtils = require('../utils/path-utils');
const fs = require('fs');
const nsfw = require('nsfw');

class IsGoodEvent {
    constructor(event, conf) {
        this.event = event;

        this.conf = conf;
    }

    run() {
        this.init();

        return !CUtils.isBadDir(this.evFolder, this.conf) &&
            this.checkAll();
    }

    init() {
        this.setPaths();

        if (fs.existsSync(this.fullPath)) {
            this.setType();
        }
    }

    setPaths() {
        this.evFolder = this.event.newDirectory || this.event.directory;

        this.evFile = this.event.newFile || this.event.file;

        this.fullPath = path.join(this.evFolder, this.evFile);

        this.remotePath = PathUtils.fullLocalToRemotePath(
            this.fullPath, this.conf.PLAYCANVAS_TARGET_DIR);
    }

    setType() {
        const stat = fs.statSync(this.fullPath);

        this.isFile = stat.isFile();

        this.isFolder = stat.isDirectory();
    }

    checkAll() {
        if (this.isFile) {
            return this.isGoodFile();

        } else if (this.isFolder) {
            return this.handleFolder();

        } else {
            return this.handleMissing();
        }
    }

    handleFolder() {
        this.event.isDirEvent = true;

        return this.isGoodDir();
    }

    handleMissing() {
        const itemOk = this.isGoodFile() ||
            (!path.extname(this.evFile) && this.isGoodDir());

        return this.event.action === nsfw.actions.DELETED && itemOk;
    }

    isGoodFile() {
        return !TypeUtils.isBadFile(this.evFile, this.remotePath, this.conf);
    }

    isGoodDir() {
        return !CUtils.isBadDir(this.fullPath, this.conf);
    }
}

module.exports = IsGoodEvent;
