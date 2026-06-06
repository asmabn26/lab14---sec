/*
 LAB 14 - Bypass Root Detection
 Script Java personnalisé
 Objectif :
 - masquer Build.TAGS
 - neutraliser RootBeer
 - cacher les fichiers root connus
 - bloquer Runtime.exec("su", "which su", "busybox")
*/

const rootIndicators = [
    "/system/bin/su",
    "/system/xbin/su",
    "/sbin/su",
    "/system/su",
    "/system/app/Superuser.apk",
    "/system/app/SuperSU.apk",
    "/system/bin/busybox",
    "/system/xbin/busybox",
    "/data/local/bin/su",
    "/data/local/xbin/su"
];

function normalize(value) {
    try {
        return String(value).toLowerCase();
    } catch (e) {
        return "";
    }
}

function commandLooksSuspicious(cmd) {
    const text = normalize(Array.isArray(cmd) ? cmd.join(" ") : cmd);
    return (
        text === "su" ||
        text.includes(" su") ||
        text.includes("which su") ||
        text.includes("busybox") ||
        text.includes("magisk")
    );
}

Java.perform(function () {
    console.log("[LAB14] Installation des hooks Java...");

    // 1. Masquer Build.TAGS
    try {
        const Build = Java.use("android.os.Build");
        Build.TAGS.value = "release-keys";
        console.log("[OK] Build.TAGS remplacé par release-keys");
    } catch (e) {
        console.log("[INFO] Build.TAGS non modifié :", e);
    }

    // 2. Neutraliser RootBeer si la classe existe
    try {
        const RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");

        RootBeer.isRooted.implementation = function () {
            console.log("[OK] RootBeer.isRooted() -> false");
            return false;
        };

        RootBeer.isRootedWithoutBusyBoxCheck.implementation = function () {
            console.log("[OK] RootBeer.isRootedWithoutBusyBoxCheck() -> false");
            return false;
        };

        RootBeer.isRootedWithBusyBoxCheck.implementation = function () {
            console.log("[OK] RootBeer.isRootedWithBusyBoxCheck() -> false");
            return false;
        };

        RootBeer.detectTestKeys.implementation = function () {
            console.log("[OK] RootBeer.detectTestKeys() -> false");
            return false;
        };

        RootBeer.checkForSuBinary.implementation = function () {
            console.log("[OK] RootBeer.checkForSuBinary() -> false");
            return false;
        };

        RootBeer.checkForBusyBoxBinary.implementation = function () {
            console.log("[OK] RootBeer.checkForBusyBoxBinary() -> false");
            return false;
        };

        RootBeer.checkForRWPaths.implementation = function () {
            console.log("[OK] RootBeer.checkForRWPaths() -> false");
            return false;
        };

    } catch (e) {
        console.log("[INFO] RootBeer non trouvé ou méthodes différentes :", e);
    }

    // 3. Masquer les fichiers root
    try {
        const File = Java.use("java.io.File");
        const existsOverload = File.exists.overload();

        existsOverload.implementation = function () {
            const path = this.getAbsolutePath();

            if (rootIndicators.indexOf(path) !== -1) {
                console.log("[OK] Fichier root masqué :", path);
                return false;
            }

            return existsOverload.call(this);
        };

        console.log("[OK] Hook java.io.File.exists installé");
    } catch (e) {
        console.log("[ERREUR] Hook File.exists impossible :", e);
    }

    // 4. Bloquer Runtime.exec
    try {
        const Runtime = Java.use("java.lang.Runtime");
        const JString = Java.use("java.lang.String");
        const StringArray = Java.use("[Ljava.lang.String;");

        const execString = Runtime.exec.overload("java.lang.String");
        execString.implementation = function (cmd) {
            if (commandLooksSuspicious(cmd)) {
                console.log("[OK] Commande bloquée :", cmd);
                return execString.call(this, "echo");
            }
            return execString.call(this, cmd);
        };

        const execArray = Runtime.exec.overload("[Ljava.lang.String;");
        execArray.implementation = function (cmdArray) {
            const values = cmdArray ? Array.from(cmdArray) : [];

            if (commandLooksSuspicious(values)) {
                console.log("[OK] Commande tableau bloquée :", values.join(" "));
                const replacement = StringArray.$new(1);
                replacement[0] = JString.$new("echo");
                return execArray.call(this, replacement);
            }

            return execArray.call(this, cmdArray);
        };

        console.log("[OK] Hooks Runtime.exec installés");
    } catch (e) {
        console.log("[ERREUR] Hook Runtime.exec impossible :", e);
    }

    console.log("[LAB14] Bypass Java terminé.");
});