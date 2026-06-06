/*
 LAB 14 - Bypass root natif compatible Frida 17+
 Objectif :
 - intercepter open, openat, access, stat, lstat
 - bloquer les chemins liés au root
*/

const nativeSuspiciousPaths = [
    "/system/bin/su",
    "/system/xbin/su",
    "/sbin/su",
    "/system/su",
    "/system/bin/busybox",
    "/system/xbin/busybox",
    "/data/local/bin/su",
    "/data/local/xbin/su"
];

function readPath(pointerValue) {
    try {
        if (pointerValue.isNull()) return "";
        return pointerValue.readCString();
    } catch (e) {
        return "";
    }
}

function isSuspiciousPath(path) {
    if (!path) return false;

    if (nativeSuspiciousPaths.indexOf(path) !== -1) {
        return true;
    }

    return (
        path.includes("/magisk") ||
        path.includes("/proc/mounts") ||
        path.includes("/proc/self/mounts")
    );
}

function getLibcExport(functionName) {
    try {
        const libc = Process.getModuleByName("libc.so");
        return libc.getExportByName(functionName);
    } catch (e) {
        console.log("[INFO] Export introuvable :", functionName, e);
        return null;
    }
}

function hookPathFunction(functionName, pathIndex) {
    const address = getLibcExport(functionName);

    if (address === null) {
        return;
    }

    Interceptor.attach(address, {
        onEnter(args) {
            const path = readPath(args[pathIndex]);

            if (isSuspiciousPath(path)) {
                this.shouldBlock = true;
                this.blockedPath = path;
            }
        },

        onLeave(retval) {
            if (this.shouldBlock) {
                console.log("[OK] Appel natif bloqué :", functionName, "=>", this.blockedPath);
                retval.replace(ptr(-1));
            }
        }
    });

    console.log("[OK] Hook natif installé :", functionName);
}

hookPathFunction("open", 0);
hookPathFunction("openat", 1);
hookPathFunction("access", 0);
hookPathFunction("stat", 0);
hookPathFunction("lstat", 0);

console.log("[LAB14] Hooks natifs chargés.");