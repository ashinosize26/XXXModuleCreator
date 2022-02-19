const $ = jQuery = require("./jquery-3.5.1.min.js");
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');
const iconv = require('iconv-lite');
const ipcRenderer = require( 'electron' ).ipcRenderer;

// 画面起動時の処理
$(document).ready( function(){

  // 設定JSONファイルオープン
  $.getJSON("setting.json" , function(data) {

    // 初期値を設定ファイルから読み込み
    $("#work_path").val(data.work_path);
    $("#vs_path").val(data.vs_path);
    $("#sol_path").val(data.sol_path.join("\n"));
    $("#cpy_dst").val(data.cpy_dst);
    $("#cpy_src_exe").val(data.cpy_src_exe.join("\n"));
    $("#cpy_src_dll").val(data.cpy_src_dll.join("\n"));
    $("#cpy_src_other").val(data.cpy_src_other.join("\n"));
    $("#cpy_src_print").val(data.cpy_src_print.join("\n"));
    $("#cpy_src_other_folder").val(data.cpy_src_other_folder.join("\n"));
    $("#upload_dst").val(data.upload_dst);
    $("#upload_name").val( () => {
      const name = data.upload_name;

      // 日付作成
      const dt = new Date();
      const YYYY = dt.getFullYear();
      const MM = ("00" + (dt.getMonth()+1)).slice(-2);
      const DD = ("00" + dt.getDate()).slice(-2);

      // %DATEを日付に変換
      return name.replace(/%YYYYMMDD/g, `${YYYY}${MM}${DD}`);
    });
    $("#upload_src_sql").val(data.upload_src_sql);
    $("#upload_dst_sql").val(data.upload_dst_sql);
    $("#upload_src_japan_view").val(data.upload_src_japan_view);
    $("#upload_dst_japan_view").val(data.upload_dst_japan_view);
    $("#upload_src_postgre").val(data.upload_src_postgre);
    $("#upload_dst_postgre").val(data.upload_dst_postgre);
    $("#mail_subject").val( () => {
      const subject = data.mail_subject;

      // 日付作成
      const dt = new Date();
      const YYYY = dt.getFullYear();
      const MM = ("00" + (dt.getMonth()+1)).slice(-2);
      const DD = ("00" + dt.getDate()).slice(-2);

      // %DATEを日付に変換
      return subject.replace(/%MM\/DD/g, `${MM}/${DD}`);
    });
    $("#mail_text").val( () => {
      const text = data.mail_text.join("\n");

      // 日付作成
      const dt = new Date();
      const YYYY = dt.getFullYear();
      const MM = ("00" + (dt.getMonth()+1)).slice(-2);
      const DD = ("00" + dt.getDate()).slice(-2);
      const HH = ("00" + dt.getHours()).slice(-2);
      const mm = ("00" + dt.getMinutes()).slice(-2);

      return text.replace(/%YYYYMMDD/g, `${YYYY}${MM}${DD}`)
      .replace(/%MM\/DD/g, `${MM}/${DD}`)
      .replace(/%HH:mm/g, `${HH}:${mm}`);

    });
    $("#mail_to").val(data.mail_to.join("\n"));
    $("#mail_cc").val(data.mail_cc.join("\n"));
    $("#mail_bcc").val(data.mail_bcc.join("\n"));
  });
});

// 実行ボタン押下
function execPA(){

  // インジケータ表示
  setTimeout(() => {
    $("#overlay").fadeIn(300);
    document.getElementById("proc_outline").innerText = '';
    document.getElementById("proc_detail").innerText = '';
    document.getElementById("exex_result_txt").value = '';
  }, 0);

  // 最初の処理　TFSから最新取得
  tfsGet();
}

// コマンド実行（非同期）
var spawn = function(cmd, args){
  return new Promise((resolve)=>{

    // コマンド実行
    let p = childProcess.spawn(cmd, args, {shell: true});

    // 終了
    p.on('exit', (code)=>{
        resolve(code);
    });

    // 実行中メッセージ
    p.stdout.on('data', (data)=>{
        document.getElementById("proc_detail").innerText = iconv.decode(data, "Shift_JIS");
    });

    // エラーメッセージ
    p.stderr.on('data', (err)=>{
      document.getElementById("proc_detail").innerText = iconv.decode(err, "Shift_JIS");
      document.getElementById("exex_result_txt").value = `Error! ${iconv.decode(err, "Shift_JIS")}`;
    });
  })
}

// TFSから最新の取得
function tfsGet () {

  // 処理を取得しない場合、次の処理へ
  if (!document.getElementById("toggle_tfs_get").checked){
    build();
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = 'TFSから最新を取得中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // TFSのワークスペースパスを取得
  const tfsPath = document.getElementById("work_path").value;

  // コマンド実行
  spawn('tf', ['get', `"${tfsPath}"`, '/recursive'])
    .then( res => {

      // 失敗
      if(res != 0){
        $("#overlay").fadeOut(300);
        return;
      }

      // 成功メッセージ
      setTimeout(() => {
        document.getElementById("exex_result_txt").value = `Success! TFSから最新取得`;
      }, 0);

      // 次の処理へ
      build();
      return;
    });
}

// ソリューションのビルド
function build () {

  // TFSから最新を取得しない場合、終了
  if (!document.getElementById("toggle_build").checked){
    copyModuleElement();
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = 'ビルド中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // VSの実行ファイルパスを取得
  const vsPath = document.getElementById("vs_path").value;

  // TFSのワークスペースパスを取得
  const workPath = document.getElementById("work_path").value;

  // ソリューションごとにビルド
  buildLoop(vsPath, workPath, 1);
}

// ソリューション配列を順にビルド
function buildLoop(vsPath, workPath, solIndex){

  // ソリューションリストの取得
  const solList = document.getElementById("sol_path").value.split('\n');

  // 終了判定
  if( solIndex > solList.length ){

    // 成功メッセージ
    setTimeout(() => {
      document.getElementById("exex_result_txt").value = `Success! ビルド`;
    }, 0);

    // 次の処理へ
    copyModuleElement();
    return;
  }

  // 空文字チェック（splitのため、テキストボックスが空でも[""]が返ってくる）
  if( !solList[solIndex - 1] ){
    buildLoop(vsPath, workPath, solIndex + 1);
    return;
  }

  // コマンド実行
  spawn(`"${vsPath}"`, ['/rebuild', 'release', `"${workPath}\\${solList[solIndex - 1]}"`])
    .then( res => {

      // 失敗
      if(res != 0){
        document.getElementById("exex_result_txt").value = `Error!  ビルド失敗 [${solList[solIndex - 1]}]`;
        $("#overlay").fadeOut(300);
        return;
      }

      // 次の処理へ
      buildLoop(vsPath, workPath, solIndex + 1);
      return;
    });
}

// モジュール構成要素をコピーして一箇所にまとめる
function copyModuleElement () {

    // 処理を取得しない場合、次の処理へ
  if (!document.getElementById("toggle_copy").checked){
    uploadModule();
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = 'モジュール要素のコピー中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // コピー先フォルダパスを取得
  const cpyDst = document.getElementById("cpy_dst").value;

  // TFSのワークスペースパスを取得
  const workPath = document.getElementById("work_path").value;

  // ソリューションごとにビルド
  fileCopyLoop(cpyDst,　workPath, "cpy_src_exe", 1);
}

// ファイルを順にコピー
function fileCopyLoop(cpyDst, workPath, textBoxId, fileIndex){

  //ファイルリストの取得
  const files = document.getElementById(textBoxId).value.split('\n');

  // 終了判定
  if( fileIndex > files.length ){

    // 次の処理へ
    switch(textBoxId){
      case "cpy_src_exe":
        fileCopyLoop(cpyDst, workPath, "cpy_src_dll", 1);
        return;

      case "cpy_src_dll":
        fileCopyLoop(cpyDst, workPath, "cpy_src_other", 1);
        return;

      case "cpy_src_other":
        fileCopyLoop(cpyDst, workPath, "cpy_src_print", 1);
        return;

      case "cpy_src_print":
        fileCopyLoop(cpyDst, workPath, "cpy_src_other_folder", 1);
        return;

      case "cpy_src_other_folder":
        // 成功メッセージ
        setTimeout(() => {
        document.getElementById("exex_result_txt").value = `Success! モジュール作成`;
        }, 0);

        // 次の処理へ
        uploadModule();
        return;
    }
  }

  // 空文字チェック（splitのため、テキストボックスが空でも[""]が返ってくる）
  if( !files[fileIndex - 1] ){
    fileCopyLoop(cpyDst, workPath, textBoxId, fileIndex + 1);
    return;
  }

  // コマンド実行
  switch(textBoxId){
    case "cpy_src_exe":
    case "cpy_src_dll":
    case "cpy_src_other":
      spawn(`xcopy`, [`"${workPath}\\${files[fileIndex - 1]}"`, `"${cpyDst}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
        .then( res => {

          // 失敗
          if(res != 0){
            $("#overlay").fadeOut(300);
            return;
          }

          // 次の処理へ
          fileCopyLoop(cpyDst, workPath, textBoxId, fileIndex + 1);
          return;
        });
      break;
    case "cpy_src_print":
      spawn(`robocopy`, [`"${workPath}\\${files[fileIndex - 1]}"`, `"${cpyDst}"`, "*.xltx", "*.rpt", "/S", "/NJS", "/NJH", "/LEV:2"])
        .then( res => {

          // 失敗
          if(res >= 8){
            $("#overlay").fadeOut(300);
            return;
          }

          // 次の処理へ
          fileCopyLoop(cpyDst, workPath, textBoxId, fileIndex + 1);
          return;
        });
      break;
    case "cpy_src_other_folder":
      spawn(`xcopy`, [`"${workPath}\\${files[fileIndex - 1]}"`, `"${cpyDst}\\${files[fileIndex - 1].split('\\').slice(-1)[0]}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
        .then( res => {

          // 失敗
          if(res != 0){
            $("#overlay").fadeOut(300);
            return;
          }

          // 次の処理へ
          fileCopyLoop(cpyDst, workPath, textBoxId, fileIndex + 1);
          return;
        });
      break;
  }
}

// モジュールをアップロード
function uploadModule () {

    // 処理を取得しない場合、次の処理へ
  if (!document.getElementById("toggle_upload").checked){
    uploadSQL();
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = 'モジュールをアップロード中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // モジュールがあるフォルダを取得
  const cpyDst = document.getElementById("cpy_dst").value;

  // アップロード先を取得
  const uploadDst = document.getElementById("upload_dst").value;

  // モジュール名を取得
  const moduleName = document.getElementById("upload_name").value;

  // コマンド実行
  spawn(`xcopy`, [`"${cpyDst}"`, `"${uploadDst}\\${moduleName}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
    .then( res => {

      // 失敗
      if(res != 0){
        $("#overlay").fadeOut(300);
        return;
      }

      // 成功メッセージ
      setTimeout(() => {
        document.getElementById("exex_result_txt").value = `Success! モジュールのアップロード`;
      }, 0);

      // 次の処理へ
      uploadSQL();
      return;
    });
}

// SQL関連をアップロード
function uploadSQL () {

    // 処理を取得しない場合、次の処理へ
  if (!document.getElementById("toggle_upload_sql").checked){
    sendMail();
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = 'SQL関連をアップロード中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // アップロード元とアップロード先を取得
  const uploadSrcSql = document.getElementById("upload_src_sql").value;
  const uploadDstSql = document.getElementById("upload_dst_sql").value;
  const uploadSrcJapanView = document.getElementById("upload_src_japan_view").value;
  const uploadDstJapanView = document.getElementById("upload_dst_japan_view").value;
  const uploadSrcPostgre = document.getElementById("upload_src_postgre").value;
  const uploadDstPostgre = document.getElementById("upload_dst_postgre").value;

  // SQLファイルのアップロード
  spawn(`xcopy`, [`"${uploadSrcSql}"`, `"${uploadDstSql}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
    .then( res => {

      // 失敗
      if(res != 0){
        $("#overlay").fadeOut(300);
        return;
      }

      // 次の処理へ
      setTimeout(() => {
        // 日本語ビューのアップロード
        spawn(`xcopy`, [`"${uploadSrcJapanView}"`, `"${uploadDstJapanView}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
        .then( res => {

          // 失敗
          if(res != 0){
            $("#overlay").fadeOut(300);
            return;
          }

          // 次の処理へ
          setTimeout(() => {
            // Postgreのアップロード
            spawn(`xcopy`, [`"${uploadSrcPostgre}"`, `"${uploadDstPostgre}\\"`, "/I", "/Y", "/K", "/D", "/S", "/R"])
            .then( res => {

              // 失敗
              if(res != 0){
                $("#overlay").fadeOut(300);
                return;
              }

              // 成功メッセージ
              setTimeout(() => {
                document.getElementById("exex_result_txt").value = `Success! SQL関連のアップロード`;
              }, 0);

              // 次の処理へ
              sendMail();
              return;
            });
          }, 0);
          return;
        });
      }, 0);
      return;
    });
}

// 通知メール送信
function sendMail () {

  // 処理を取得しない場合、次の処理へ
  if (!document.getElementById("toggle_mail").checked){

    // 終了
    setTimeout(() => {
      $("#overlay").fadeOut(300);
    }, 0);
    return;
  }

  // インジケータのラベル変更
  setTimeout(() => {
    document.getElementById("proc_outline").innerText = '通知メールの送信中';
    document.getElementById("proc_detail").innerText = '';
  }, 0);

  // 件名を取得
  const subject = document.getElementById("mail_subject").value;

  // 本文を取得
  const text = document.getElementById("mail_text").value;

  // Toを取得
  const to = document.getElementById("mail_to").value;

  // CCを取得
  const cc = document.getElementById("mail_cc").value;

  // BCCを取得
  const bcc = document.getElementById("mail_bcc").value;

  //メール送信
  ipcRenderer.send('mailer', subject, text, to, cc, bcc);

  // 次の処理へ
  setTimeout(() => {
    document.getElementById("exex_result_txt").value = `Success! 通知メール送信`;
    $("#overlay").fadeOut(300);
  }, 0);
  return;
}

$(function() {

  // TFSから最新Getの設定オープンボタン
  $("#open_tfs").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_tfs").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // TFSから最新Getの設定クローズボタン
  $("#close_tfs").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_tfs").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });

  // ビルドの設定オープンボタン
  $("#open_build").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_build").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // ビルドの設定クローズボタン
  $("#close_build").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_build").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });

  // モジュール作成の設定オープンボタン
  $("#open_module").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_module").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // モジュール作成の設定クローズボタン
  $("#close_module").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_module").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });

  // アップロードの設定オープンボタン
  $("#open_upload").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_upload").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // アップロードの設定クローズボタン
  $("#close_upload").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_upload").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });
  // アップロードの設定オープンボタン
  $("#open_upload_sql").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_upload_sql").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // アップロードの設定クローズボタン
  $("#close_upload_sql").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_upload_sql").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });
  // メールの設定オープンボタン
  $("#open_mail").on("click", function() {

    // 設定エリアを表示
    $(this).parent().parent().parent().find(".setting_mail").toggle(300);

    // オープンボタンを非表示
    $(this).hide();

    // クローズボタンを表示
    $(this).next().show();
  });

  // メールの設定クローズボタン
  $("#close_mail").on("click", function() {

    // 設定エリアを非表示
    $(this).parent().parent().parent().find(".setting_mail").toggle(300);

    // クローズボタンを非表示
    $(this).hide();

    // オープンボタンを表示
    $(this).prev().show();
  });
});

// JSONファイルに保存する（ワークスペース）
function save_work_path(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.work_path = document.getElementById(`work_path`).value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

// JSONファイルに保存する（VisualStudio実行ファイルのパス）
function save_vs_path(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.vs_path = document.getElementById("vs_path").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

// JSONファイルに保存する（ソリューション）
function save_sol_path(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.sol_path = document.getElementById("sol_path").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

// JSONファイルに保存する（モジュール作成場所）
function save_cpy_dst(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_dst = document.getElementById("cpy_dst").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_cpy_src_exe(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_src_exe = document.getElementById("cpy_src_exe").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_cpy_src_dll(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_src_dll = document.getElementById("cpy_src_dll").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_cpy_src_other(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_src_other = document.getElementById("cpy_src_other").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_cpy_src_print(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_src_print = document.getElementById("cpy_src_print").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_cpy_src_other_folder(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.cpy_src_other_folder = document.getElementById("cpy_src_other_folder").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

// JSONファイルに保存する（モジュール作成場所）
function save_upload_dst(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_dst = document.getElementById("upload_dst").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_src_sql(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_src_sql = document.getElementById("upload_src_sql").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_dst_sql(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_dst_sql = document.getElementById("upload_dst_sql").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_src_japan_view(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_src_japan_view = document.getElementById("upload_src_japan_view").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_dst_japan_view(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_dst_japan_view = document.getElementById("upload_dst_japan_view").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_src_postgre(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_src_postgre = document.getElementById("upload_src_postgre").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_upload_dst_postgre(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.upload_dst_postgre = document.getElementById("upload_dst_postgre").value;

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_mail_to(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.mail_to = document.getElementById("mail_to").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_mail_cc(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.mail_cc = document.getElementById("mail_cc").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}

function save_mail_bcc(){

  // 二度押し防止で処理中は押せなくする
  this.disabled = true;

  // インジケータ表示
  $("#overlay").fadeIn(300);

  // インジケータのラベル変更
  document.getElementById("proc_outline").innerText = '保存中';
  document.getElementById("proc_detail").innerText = '';

  // JSONファイルオープン
  var data = JSON.parse(
    fs.readFileSync(
      path.resolve( __dirname , "setting.json" )
    )
  );

  // JSONファイル書き込み
  data.mail_bcc = document.getElementById("mail_bcc").value.split('\n');

  // JSONファイル保存
  fs.writeFileSync(
    path.resolve( __dirname , "setting.json" ),
    JSON.stringify(data, null, '    '),
    "utf-8"
  );

  // 一瞬で抜けると保存されたか分からないので、500ms待機
  setTimeout(() => {

    // ボタンを押せるようにする
    this.disabled = false;

    // インジケータ非表示
    $("#overlay").fadeOut(300);
  }, 500);
}