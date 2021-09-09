# Step-by-Step Setup Guide

This is a brief step-by-step installation and setup guide to
supplement our [README](README.md), which
provides details and alternatives for the steps below.

Install a recent stable version of `node`. 
We recommend using `nvm`.

Download or clone https://github.com/playcanvas/playcanvas-sync

Install dependencies by running 
```
npm install
```
from the `playcanvas-sync` folder.

After this, you can either run the tool from the `playcanvas-sync` folder,
or install it globally with
```
npm install -g
```

To uninstall globally, run

```
npm uninstall -g
```
Get your PlayCanvas api key (token) from your PlayCanvas account page
(playcanvas.com/&lt;username&gt;/account).

Open Chrome Developer Tools console on the PlayCanvas Editor page
and run 
```
copy({
  PLAYCANVAS_BRANCH_ID: config.self.branch.id,
  PLAYCANVAS_PROJECT_ID: config.project.id
})
```
This will copy your branch and project id to the clipboard. Paste them
into a file called `.pcconfig` in your home directory.

Alternatively, you can get your branch id from the
Version Control Panel of the PlayCanvas Editor, and
your project id from its home page url, e.g.
for `playcanvas.com/project/10/overview/test_proj` the id is 10.

Create a directory for the local versions of your PlayCanvas files, e.g.
`proj1`. Add its full path to `.pcconfig`, along with your api key.
A sample full `.pcconfig` should look like this:

```
{
  "PLAYCANVAS_BRANCH_ID": "abc",
  "PLAYCANVAS_PROJECT_ID": 10,
  "PLAYCANVAS_TARGET_DIR": "/Users/zpaul/proj1",
  "PLAYCANVAS_API_KEY": "xyz",
  "PLAYCANVAS_BAD_FILE_REG": "^\\.|~$",
  "PLAYCANVAS_BAD_FOLDER_REG": "\\."
}
```
The variables `PLAYCANVAS_BAD_FILE_REG` and `PLAYCANVAS_BAD_FOLDER_REG` tell
the tool which files and folders to exclude. Their values in our
sample `.pcconfig` above are sufficient for most users, so you can simply
copy them. More details in [README](README.md#files-and-folders-to-exclude)
