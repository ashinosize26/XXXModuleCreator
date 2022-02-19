'use strict';

// JavaScriptモジュール読み込み
const electron = require("electron");

// アプリケーションをコントロールするモジュール
const app = electron.app;

// ウィンドウを作成するモジュール
const BrowserWindow = electron.BrowserWindow;

// ウィンドウのメニュー
const Menu = electron.Menu;

// メインウィンドウはGCされないようにグローバル宣言
let mainWindow;

//Node.js側とHTML側で通信をするモジュール
const ipcMain = require('electron').ipcMain;

//vbs実行用（同期的にexe実行を行う）
var spawnSync = require('child_process').spawnSync;

// 全てのウィンドウが閉じたら終了
app.on('window-all-closed', function() {
    if (process.platform != 'darwin') {
        app.quit();
    }
});

// Electronの初期化完了後に実行
app.on('ready', function() {

    // メイン画面の作成
    mainWindow = new BrowserWindow({
        width: 900,
        height: 650,
        icon: `${__dirname}/images/icon.png`,
        resizable:false,
        frame:false
    });

    // メイン画面に表示URLの設定
    mainWindow.loadURL(`file://${__dirname}/index.html`)

    // メニューの設定
    Menu.setApplicationMenu(null);

    // ウィンドウが閉じられたらアプリも終了
    mainWindow.on('closed', function() {
        mainWindow = null;
    });
});

//メール送信コントロール
ipcMain.on('mailer', function( event, subject, text, to, cc, bcc){

    // 実行するVBSファイルの作成
    var fullpath = `${__dirname}/mailer.vbs`;

    //コマンドラインを構築
    var ret = vbsCommand(fullpath, subject, text, to, cc, bcc);
});

//外部コマンドを実行する
function vbsCommand(fullpath, subject, text, to, cc, bcc) {

    //コマンドを組み立てて実行
    var child = spawnSync('cscript.exe', [ fullpath, subject, text, to, cc, bcc ] );

    //返り値を取得する(status)
    var ret = child.status;

    //retを返す
    return ret;
}