
import fs from"fs";

export async function open(fileName, openFlags, cacheSize) {
    cacheSize = cacheSize || 4096*64;
    if (["w+", "wx+", "r", "ax+", "a+"].indexOf(openFlags) <0)
        throw new Error("Invalid open option");
    const fd =await fs.promises.open(fileName, openFlags);

    const stats = await fd.stat();

    return  new FastFile(fd, stats, cacheSize, fileName);
}

const tmpBuff32 = new Uint8Array(4);
const tmpBuff32v = new DataView(tmpBuff32.buffer);
const tmpBuff64 = new Uint8Array(8);
const tmpBuff64v = new DataView(tmpBuff64.buffer);

class FastFile {

    constructor(fd, stats, cacheSize, fileName) {
        this.fileName = fileName;
        this.fd = fd;
        this.pos = 0;
        this.pageBits = 8;
        this.pageSize = (1 << this.pageBits);
        while (this.pageSize < stats.blksize*4) {
            this.pageBits ++;
            this.pageSize *= 2;
        }
        this.totalSize = stats.size;
        this.totalPages = Math.floor((stats.size -1) / this.pageSize)+1;
        this.maxPagesLoaded = Math.floor( cacheSize / this.pageSize)+1;
        this.pages = {};
        this.pendingLoads = [];
        this.writing = false;
        this.reading = false;
    }

    _loadPage(p) {
        const self = this;
        return new Promise((resolve, reject)=> {
            self.pendingLoads.push({
                page: p,
                resolve: resolve,
                reject: reject
            });
            setImmediate(self._triggerLoad.bind(self));
        });
    }


    _triggerLoad() {
        const self = this;
        processPendingLoads();
        if (self.pendingLoads.length == 0) return;
        if (Object.keys(self.pages).length >= self.maxPagesLoaded) {
            const dp = getDeletablePage();
            if (dp<0) {  // // No sizes available
//                setTimeout(self._triggerLoad.bind(self), 10000);
                return;
            }
            delete self.pages[dp];
        }
        const load = self.pendingLoads.shift();
        if (load.page>=self.totalPages) {
            self.pages[load.page] = {
                dirty: false,
                buff: new Uint8Array(self.pageSize),
                pendingOps: 1,
                size: 0
            };
            load.resolve();
            setImmediate(self._triggerLoad.bind(self));
            return;
        }
        if (self.reading) {
            self.pendingLoads.unshift(load);
            return;  // Only one read at a time.
        }

        self.reading = true;
        const page = {
            dirty: false,
            buff: new Uint8Array(self.pageSize),
            pendingOps: 1,
            size: 0
        };
        self.fd.read(page.buff, 0, self.pageSize, load.page*self.pageSize).then((res)=> {
            page.size = res.bytesRead;
            self.pages[load.page] = page;
            self.reading = false;
            load.resolve();
            setImmediate(self._triggerLoad.bind(self));
        }, (err) => {
            load.reject(err);
        });

        function processPendingLoads() {
            const newPendingLoads = [];
            for (let i=0; i<self.pendingLoads.length; i++) {
                const load = self.pendingLoads[i];
                if (typeof self.pages[load.page] != "undefined") {
                    self.pages[load.page].pendingOps ++;
                    load.resolve();
                } else {
                    newPendingLoads.push(load);
                }
            }
            self.pendingLoads = newPendingLoads;
        }

        function getDeletablePage() {
            for (let p in self.pages) {
                const page = self.pages[p];
                if ((page.dirty == false)&&(page.pendingOps==0)) return p;
            }
            return -1;
        }
    }

    _triggerWrite() {
        const self = this;
        if (self.writing) return;
        const p = self._getDirtyPage();
        if (p<0) {
            if (self.pendingClose) self.pendingClose();
            return;
        }
        self.writing=true;
        self.pages[p].dirty = false;
        self.fd.write(self.pages[p].buff, 0, self.pages[p].size, p*self.pageSize).then(() => {
            self.writing = false;
            setImmediate(self._triggerWrite.bind(self));
            setImmediate(self._triggerLoad.bind(self));
        }, (err) => {
            console.log("ERROR Writing: "+err);
            self.error = err;
            self._tryClose();
        });

    }

    _getDirtyPage() {
        for (let p in this.pages) {
            if (this.pages[p].dirty) return p;
        }
        return -1;
    }

    async write(buff, pos) {
        if (buff.byteLength == 0) return;
        const self = this;
/*
        if (buff.byteLength > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(buff.byteLength * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
*/
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+buff.byteLength;
        if (self.totalSize < pos + buff.byteLength) self.totalSize = pos + buff.byteLength;
        if (self.pendingClose)
            throw new Error("Writing a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos+buff.byteLength-1) / self.pageSize);

        // for (let i=firstPage; i<=lastPage; i++) await self._loadPage(i);

        let p = firstPage;
        let o = pos % self.pageSize;
        let r = buff.byteLength;
        while (r>0) {
            await self._loadPage(p);
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(buff.buffer, buff.byteLength - r, l);
            const dstView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            dstView.set(srcView);
            self.pages[p].dirty = true;
            self.pages[p].pendingOps --;
            self.pages[p].size = Math.max(o+l, self.pages[p].size);
            if (p>=self.totalPages) {
                self.totalPages = p+1;
            }
            r = r-l;
            p ++;
            o = 0;
            setImmediate(self._triggerWrite.bind(self));
        }
    }

    async read(len, pos) {
        if (len == 0) {
            return new Uint8Array(0);
        }
        const self = this;
        if (len > self.pageSize*self.maxPagesLoaded*0.8) {
            const cacheSize = Math.floor(len * 1.1);
            this.maxPagesLoaded = Math.floor( cacheSize / self.pageSize)+1;
        }
        if (typeof pos == "undefined") pos = self.pos;
        self.pos = pos+len;
        if (self.pendingClose)
            throw new Error("Reading a closing file");
        const firstPage = Math.floor(pos / self.pageSize);
        const lastPage = Math.floor((pos+len-1) / self.pageSize);

        for (let i=firstPage; i<=lastPage; i++) await self._loadPage(i);

        let buff = new Uint8Array(len);
        let dstView = new Uint8Array(buff);
        let p = firstPage;
        let o = pos % self.pageSize;
        // Remaining bytes to read
        let r = pos + len > self.totalSize ? len - (pos + len - self.totalSize): len;
        while (r>0) {
            // bytes to copy from this page
            const l = (o+r > self.pageSize) ? (self.pageSize -o) : r;
            const srcView = new Uint8Array(self.pages[p].buff.buffer, o, l);
            buff.set(srcView, dstView.byteLength-r);
            self.pages[p].pendingOps --;
            r = r-l;
            p ++;
            o = 0;
        }
        setImmediate(self._triggerLoad.bind(self));
        return buff;
    }

    _tryClose() {
        const self = this;
        if (!self.pendingClose) return;
        if (self.error) {
            self.pendingCloseReject(self.error);
        }
        const p = self._getDirtyPage();
        if ((p>=0) || (self.writing) || (self.reading) || (self.pendingLoads.length>0)) return;
        self.pendingClose();
    }

    close() {
        const self = this;
        if (self.pendingClose)
            throw new Error("Closing the file twice");
        return new Promise((resolve, reject) => {
            self.pendingClose = resolve;
            self.pendingCloseReject = reject;
            self._tryClose();
        }).then(()=> {
            self.fd.close();
        }, (err) => {
            self.fd.close();
            throw (err);
        });
    }

    async discard() {
        const self = this;
        await self.close();
        await fs.promises.unlink(this.fileName);
    }

    async writeULE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, true);

        await self.write(tmpBuff32, pos);
    }

    async writeUBE32(v, pos) {
        const self = this;

        tmpBuff32v.setUint32(0, v, false);

        await self.write(tmpBuff32, pos);
    }


    async writeULE64(v, pos) {
        const self = this;

        tmpBuff64v.setUint32(0, v & 0xFFFFFFFF, true);
        tmpBuff64v.setUint32(4, Math.floor(v / 0x100000000) , true);

        await self.write(tmpBuff64, pos);
    }

    async readULE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new Uint32Array(b.buffer);

        return view[0];
    }

    async readUBE32(pos) {
        const self = this;
        const b = await self.read(4, pos);

        const view = new DataView(b.buffer);

        return view.getUint32(0, false);
    }

    async readULE64(pos) {
        const self = this;
        const b = await self.read(8, pos);

        const view = new Uint32Array(b.buffer);

        return view[1] * 0x100000000 + view[0];
    }

}
