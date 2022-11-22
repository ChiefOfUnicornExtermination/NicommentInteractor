// アクセスした生放送のページのhtmlから情報を取ってくる
const embeddedData = JSON.parse(document.getElementById("embedded-data").getAttribute("data-props"));
const url_system = embeddedData.site.relive.webSocketUrl;
const user_id = embeddedData.user.id;

// websocketでセッションに送るメッセージ
const message_system_1 = '{"type":"startWatching","data":{"stream":{"quality":"abr","protocol":"hls","latency":"low","chasePlay":false},"room":{"protocol":"webSocket","commentable":true},"reconnect":false}}';
const message_system_2 ='{"type":"getAkashic","data":{"chasePlay":false}}'

// コメントセッションへWebSocket接続するときに必要な情報
let uri_comment
let threadID
let threadkey
let mes_comment
let postKey
let ticket
let vpos

//視聴セッションのWebSocket関係の関数 
// 視聴セッションとのWebSocket接続関数の定義
function connect_WebSocket_system()
{
  websocket_system = new WebSocket(url_system);
  websocket_system.onopen = function(evt) { onOpen_system(evt) };
  websocket_system.onclose = function(evt) { onClose_system(evt) };
  websocket_system.onmessage = function(evt) { onMessage_system(evt) };
  websocket_system.onerror = function(evt) { onError_system(evt) };
}

// 視聴セッションとのWebSocket接続が開始された時に実行される
function onOpen_system(evt)
{
  console.log("CONNECTED TO THE SYSTEM SERVER");
  doSend_system(message_system_1);
  doSend_system(message_system_2);
}

// 視聴セッションとのWebSocket接続が切断された時に実行される
function onClose_system(evt)
{
  console.log("DISCONNECTED FROM THE SYSTEM SERVER");
  websocket_comment.close(); // コメントセッションとのWebSocket接続を切る
}

var msq = null;

// 視聴セッションとのWebSocket接続中にメッセージを受け取った時に実行される
function onMessage_system(evt)
{
  console.log('RESPONSE FROM THE SYSTEM SERVER: ' + evt.data);
  is_room = evt.data.indexOf("room")
  is_ping = evt.data.indexOf("ping")

  // コメントセッションへ接続するために必要な情報が送られてきたら抽出してWebSocket接続を開始
  if(is_room>0){

      // 必要な情報を送られてきたメッセージから抽出
      evt_data_json = JSON.parse(evt.data);
      uri_comment = evt_data_json.data.messageServer.uri
      threadID = evt_data_json.data.threadId
      threadkey = evt_data_json.data.yourPostKey
      message_comment = '[{"ping":{"content":"rs:0"}},{"ping":{"content":"ps:0"}},{"thread":{"thread":"'+threadID+'","version":"20061206","user_id":"'+user_id+'","res_from":-150,"with_global":1,"scores":1,"nicoru":0,"threadkey":"'+threadkey+'"}},{"ping":{"content":"pf:0"}},{"ping":{"content":"rf:0"}}]'
      // コメントセッションとのWebSocket接続を開始
      connect_WebSocket_comment();
  }
  if (msq) {
    var result = msq(evt.data);
      if (result) msq = null;
  }

  // pingが送られてきたらpongとkeepseatを送り、視聴権を獲得し続ける
  if(is_ping>0){
    doSend_system('{"type":"pong"}');
    doSend_system('{"type":"keepSeat"}');
  }
}

// 視聴セッションとのWebSocket接続中にエラーメッセージを受け取った時に実行される
function onError_system(evt)
{
  console.log('ERROR FROM THE SYSTEM SERVER: ' + evt.data);
}

// 視聴セッションへメッセージを送るための関数
function doSend_system(message)
{
  console.log("SENT TO THE SYSTEM SERVER: " + message);
  websocket_system.send(message);
}

// コメントセッションのWebSocket関係の関数
// コメントセッションとのWebSocket接続関数の定義
function connect_WebSocket_comment()
{
  websocket_comment = new WebSocket(uri_comment, 'niconama', {
    headers: {
      'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
      'Sec-WebSocket-Protocol': 'msg.nicovideo.jp#json',
    },
  });
  websocket_comment.onopen = function(evt) { onOpen_comment(evt) };
  websocket_comment.onclose = function(evt) { onClose_comment(evt) };
  websocket_comment.onmessage = function(evt) { onMessage_comment(evt) };
  websocket_comment.onerror = function(evt) { onError_comment(evt) };
}

// コメントセッションとのWebSocket接続が開始された時に実行される
function onOpen_comment(evt)
{
  console.log("CONNECTED TO THE COMMENT SERVER");
  doSend_comment(message_comment);
}

// コメントセッションとのWebSocket接続が切断された時に実行される
function onClose_comment(evt)
{
  console.log("DISCONNECTED FROM THE COMMENT SERVER");
}

var messageResponseQueue = null;
// コメントセッションとのWebSocket接続中にメッセージを受け取った時に実行される
function onMessage_comment(evt)
{
  if (messageResponseQueue){
    if (messageResponseQueue(evt)){
      messageResponseQueue = null;
    }
  }
  var chatdata = JSON.parse(evt.data).chat;
  if (chatdata && chatdata.vpos) vpos = chatdata.vpos;
  // メッセージが存在して『自分の投稿でない場合（重要）』処理を行います。この場合自分の投稿とは「受付完了メッセージ」のこととなり、yourpostをチェックしない場合は自分自身のコメントに反応して永久ループしてしまいます
  if (chatdata && chatdata.content && !chatdata.yourpost) handle_message(chatdata.content);
  console.log('RESPONSE FROM THE COMMENT SERVER: ' + evt.data);
}

// コメントセッションとのWebSocket接続中にエラーメッセージを受け取った時に実行される
function onError_comment(evt)
{
  console.log('ERROR FROM THE COMMENT SERVER: ' + evt.data);
}

// コメントセッションへメッセージを送るための関数
function doSend_comment(message)
{
  console.log("SENT TO THE COMMENT SERVER: " + message);
  websocket_comment.send(message);
}

// 視聴セッションとのWebSocket接続開始
connect_WebSocket_system();

// コメント（チャット）を投稿する
function doPost_chat(message){
  // 元のコメントより取得した現在ポジションの150カウント（1.5秒）後に受付完了メッセージを流します。文字サイズ：大き目、下部、オレンジ色を指定していますが、スクリプト実行ユーザーがプライム会員でない場合はそれらは有効になりません。
  doSend_system('{"type":"postComment","data":{"isAnonymous": false, "size":"big", "position": "shita", "color": "orange","text":"' + message + '","vpos":' + (vpos + 150) + '}}');
}
// デバイスコントロール
var xhr = new XMLHttpRequest();

// ** 以下、コメント処理 **
// コメント処理メイン。有効なデバイスに対して対応するコマンドが見つかった場合のみhandle_commandを呼び出します。
function handle_message(message){
  
  if (message){
    for(var deviceindex in devices){
      if (foundInArray(message, devices[deviceindex].devicenamecandidates) && devices[deviceindex].isAvailable){
        for(var commandindex in devices[deviceindex].commands){
          var keyword = foundInArray(message, devices[deviceindex].commands[commandindex].keywords);
          if (keyword){
            handle_command(devices[deviceindex], message, devices[deviceindex].commands[commandindex]);
            return;
          }
        }
      }
    }
  }
}

// 指定のデバイスに対するコマンドの処理。これが呼ばれたとしても処理からの戻り値がなかった場合は処理を行いません。
function handle_command(device, message, command){
  var commandOrder = command.handlingfunc(device, message);
  if (commandOrder){
    // 今のところ特定のURLに固定キーをヘッダにつけさえすれば動作するAPIばかりだったので（GOVEEのスッカラカンセキュリティは最高だぜヒャッハー！）単純に投げるだけです。都度認証や生成されたトークンを指定しなければならないAPIの場合は処理を追加してください。
    var queryString = command.querystring && command.querystring.length && command.querystring.join("") ? ("?" + command.querystring.join("&")) : "";
    xhr.open(device.method, device.baseUrl + queryString, true);
    for(var deviceHeaderkey in device.headers){
      xhr.setRequestHeader(deviceHeaderkey, device.headers[deviceHeaderkey]);
    }
    // デバイスの設定でrequestBodyとして定義されている値（だいたいJSON）の{{0}}、{{1}}という変数部分を指定のコマンド、処理から返された値に置き換えます。もっと多くの箇所を変えなければならないデバイスやAPIの場合は都度追加してください。
    xhr.send(device.requestBody.replace("{{0}}", command.commandcode).replace("{{1}}", commandOrder.value));
    setTimeout(function(){if (xhr.responseText && xhr.responseText.indexOf("200") >= 0){
    // 「[デバイス名]のデバイスコマンド名（{{0}}の部分をメッセージ戻り値で置き換え）」を受け付けました　というコメントをニコニコに投稿。
    // コメント取得直後に実行すると投稿されたコメントがリアルタイムで見えない（コメント投稿扱いにはなっているもののリアルタイム視聴者には見えず、TSで見ると投稿されて見える）、もしくはwebsocket_systemが解放されておらずコメントが受け付けられないことがあるため、
    // １秒ずらして別スレッド扱いにして投稿
      doPost_chat("「[" + device.devicename + "] の " + command.finishMessage.replace("{{0}}", commandOrder.message) + "」を受け付けました");
    }}, 1000);
  }
}

// キーワード配列内から対象のキーワードがあるかどうか、あるならその値を返す便利メソッド。ContainsとかIndexOfあたりでなんとかなりそうだけど処理の見栄えを見やすくするために専用メソッドにしておく。
function foundInArray(value, keywords){
   for (var keywordIndex in keywords){
       if (value.indexOf(keywords[keywordIndex]) >= 0){
         return keywords[keywordIndex];
     }
   }
   return false;
}


// ** ここからが配信者個別の設定 **
// 配信者個別のデバイスとAPIの設定
var devices = new Array(
  {
    deviceid: 1,
    devicename: "ファウンテン",
  isAvailable: true,
    devicenamecandidates: ["fountain", "ファウンテン", "滝", "泉", "いずみ", "女神像", "ミルクメイド", "水の"],
    baseUrl: "https://developer-api.govee.com/v1/devices/control",
    method: "PUT",
  headers: {"Govee-API-Key" : "d3a90cc5-12c1-45af-9d84-1f48aaa854b2", "Content-Type" : "application/json"},
  requestBody: '{"device":"E2:6B:D4:AD:FC:1A:9B:FF","model":"H619Z","cmd":{"name":"{{0}}","value":{{1}}}}',
    commands: {
    brightness:{
      keywords: ["明る", "暗く", "あかる", "くらく", "ライト", "らいと", "眩し", "まぶし", "bright", "light", "ブライトネス", "ぶらいとねす", "シャイニーネス", "ダーク", "ダーカー", "dark"],
        finishMessage: "明るさを{{0}}",
      commandcode: "brightness",
      querystring: [""],
      handlingfunc: controlfunc_brightness
    },
    color:{
      keywords: ["Red", "red", "赤", "あか", "レッド", "れっど", "緋", "Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ", "Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん", "Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる","Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー", "Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん","Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー", "どどめ", "ドドメ", "redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂",
      "Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー", "金色", "きんいろ", "キンイロ", "ごーるど", "ゴールド", "ゴールデン", "Gold", "gold", "Pink", "pink", "ピンク", "ぴんく", "桃", "もも",
      "濃く", "濃ゆく", "こく", "こゆく", "うすく", "薄く", "薄め", "うすめ", "あわく", "淡く", "Vivid", "vivid", "pale", "Pale", "Stale", "stale"],
        finishMessage: "色を{{0}}",
      commandcode: "color",
      querystring: [""],
      handlingfunc: controlfunc_color
    },
    power:{
      keywords: ["消して", "消す", "消せ", "けせ", "けす", "けして", "つけろ", "つける", "付ける", "点灯", "消灯", "turn on", "turn fountain off", "turn fountain on", "turn off", "オン", "オフ"],
        finishMessage: "{{0}}",
      commandcode: "turn",
      querystring: [""],
      handlingfunc: controlfunc_lightpower
    }
  },
  currentvariables: {}
  },
  {
    deviceid: 2,
    devicename: "ペンデュラム",
  isAvailable: false,
    devicenamecandidates: ["pendulum", "ペンデュラム", "振り子", "振子", "投影", "プロジェクタ"],
    baseUrl: "https://developer-api.govee.com/v1/devices/control",
    method: "PUT",
  headers: {"Govee-API-Key" : "d3a90cc5-12c1-45af-9d84-1f48aaa854b2", "Content-Type" : "application/json"},
  requestBody: '{"device":"E2:6B:D4:AD:FC:1A:9B:FF","model":"H619Z","cmd":{"name":"{{0}}","value":{{1}}}}',
    commands: {
    brightness:{
      keywords: ["明る", "暗く", "あかる", "くらく", "ライト", "らいと", "眩し", "まぶし", "bright", "light", "ブライトネス", "ぶらいとねす", "シャイニーネス", "ダーク", "ダーカー", "dark"],
        finishMessage: "明るさを{{0}}",
      commandcode: "brightness",
      querystring: [""],
      handlingfunc: controlfunc_brightness
    },
    color:{
      keywords: ["Red", "red", "赤", "あか", "レッド", "れっど", "緋", "Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ", "Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん", "Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる","Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー", "Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん","Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー", "どどめ", "ドドメ", "redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂",
      "Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー", "金色", "きんいろ", "キンイロ", "ごーるど", "ゴールド", "ゴールデン", "Gold", "gold", "Pink", "pink", "ピンク", "ぴんく", "桃", "もも",
      "濃く", "濃ゆく", "こく", "こゆく", "うすく", "薄く", "薄め", "うすめ", "あわく", "淡く", "Vivid", "vivid", "pale", "Pale", "Stale", "stale"],
        finishMessage: "色を{{0}}",
      commandcode: "color",
      querystring: [""],
      handlingfunc: controlfunc_color
    },
    power:{
      keywords: ["消して", "消す", "消せ", "けせ", "けす", "けして", "つけろ", "つける", "付ける", "点灯", "消灯", "turn on", "turn fountain off", "turn fountain on", "turn off", "オン", "オフ"],
        finishMessage: "{{0}}",
      commandcode: "turn",
      querystring: [""],
      handlingfunc: controlfunc_lightpower
    }
  },
  currentvariables: {}
  },
  {
    deviceid: 3,
    devicename: "ペンデュラム",
  isAvailable: false,
    devicenamecandidates: ["pendulum", "ペンデュラム", "振り子", "振子", "投影", "プロジェクタ"],
    baseUrl: "https://api.switch-bot.com/v1.0/devices/DBED25908D5F/commands",
    method: "POST",
  headers: {"Authorization" : "d7ec9af83c47e6da30aedf0822ebc861c0bf3847b1cf5e2644e76bdd780a11f2a3d14f204d4dfed85794f8e07fda2ed0v", "Content-Type" : "application/json", "referrer" : "no-referrer"},
  requestBody: '{"command":"press","parameter":"default","commandType": "command"}',
    commands: {
    reswing:{
      keywords: ["振る", "振り直し", "ふり直し","振りなおし","ふりなおし", "再", "ふる", "ゆらす", "揺らす", "swing", "retouch", "move", "動か", "run"],
        finishMessage: "振り直し",
      commandcode: "move",
      querystring: [""],
      handlingfunc: controlfunc_move
    }
  },
  currentvariables: {}
  },
  {
    deviceid: 4,
    devicename: "時計",
  isAvailable: true,
    devicenamecandidates: ["時計", "とけい", "クロック", "くろっく", "clock"],
    baseUrl: "https://developer-api.govee.com/v1/devices/control",
    method: "PUT",
  headers: {"Govee-API-Key" : "d3a90cc5-12c1-45af-9d84-1f48aaa854b2", "Content-Type" : "application/json"},
  requestBody: '{"device":"30:7B:D4:AD:FC:33:7F:21","model":"H619Z","cmd":{"name":"{{0}}","value":{{1}}}}',
    commands: {
    brightness:{
      keywords: ["明る", "暗く", "あかる", "くらく", "ライト", "らいと", "眩し", "まぶし", "bright", "light", "ブライトネス", "ぶらいとねす", "シャイニーネス", "ダーク", "ダーカー", "dark"],
        finishMessage: "明るさを{{0}}",
      commandcode: "brightness",
      querystring: [""],
      handlingfunc: controlfunc_brightness
    },
    color:{
      keywords: ["Red", "red", "赤", "あか", "レッド", "れっど", "緋", "Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ", "Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん", "Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる","Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー", "Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん","Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー", "どどめ", "ドドメ", "redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂",
      "Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー", "金色", "きんいろ", "キンイロ", "ごーるど", "ゴールド", "ゴールデン", "Gold", "gold", "Pink", "pink", "ピンク", "ぴんく", "桃", "もも",
      "濃く", "濃ゆく", "こく", "こゆく", "うすく", "薄く", "薄め", "うすめ", "あわく", "淡く", "Vivid", "vivid", "pale", "Pale", "Stale", "stale"],
        finishMessage: "色を{{0}}",
      commandcode: "color",
      querystring: [""],
      handlingfunc: controlfunc_color
    },
    power:{
      keywords: ["消して", "消す", "消せ", "けせ", "けす", "けして", "つけろ", "つける", "付ける", "点灯", "消灯", "turn on", "turn fountain off", "turn fountain on", "turn off", "オン", "オフ"],
        finishMessage: "{{0}}",
      commandcode: "turn",
      querystring: [""],
      handlingfunc: controlfunc_lightpower
    }
  },
  currentvariables: {}
  },
  {
    deviceid: 5,
    devicename: "サンドアート",
  isAvailable: true,
    devicenamecandidates: ["砂", "サンド", "アワーグラス", "模様", "すなの", "さんど", "sand ", "sandart"],
    baseUrl: "https://developer-api.govee.com/v1/devices/control",
    method: "PUT",
  headers: {"Govee-API-Key" : "d3a90cc5-12c1-45af-9d84-1f48aaa854b2", "Content-Type" : "application/json"},
  requestBody: '{"device":"46:DF:D4:AD:FC:40:84:76","model":"H619Z","cmd":{"name":"{{0}}","value":{{1}}}}',
    commands: {
    brightness:{
      keywords: ["明る", "暗く", "あかる", "くらく", "ライト", "らいと", "眩し", "まぶし", "bright", "light", "ブライトネス", "ぶらいとねす", "シャイニーネス", "ダーク", "ダーカー", "dark"],
        finishMessage: "明るさを{{0}}",
      commandcode: "brightness",
      querystring: [""],
      handlingfunc: controlfunc_brightness
    },
    color:{
      keywords: ["Red", "red", "赤", "あか", "レッド", "れっど", "緋", "Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ", "Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん", "Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる","Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー", "Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん","Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー", "どどめ", "ドドメ", "redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂",
      "Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー", "金色", "きんいろ", "キンイロ", "ごーるど", "ゴールド", "ゴールデン", "Gold", "gold", "Pink", "pink", "ピンク", "ぴんく", "桃", "もも",
      "濃く", "濃ゆく", "こく", "こゆく", "うすく", "薄く", "薄め", "うすめ", "あわく", "淡く", "Vivid", "vivid", "pale", "Pale", "Stale", "stale"],
        finishMessage: "色を{{0}}",
      commandcode: "color",
      querystring: [""],
      handlingfunc: controlfunc_color
    },
    power:{
      keywords: ["消して", "消す", "消せ", "けせ", "けす", "けして", "つけろ", "つける", "付ける", "点灯", "消灯", "turn on", "turn fountain off", "turn fountain on", "turn off", "オン", "オフ"],
        finishMessage: "{{0}}",
      commandcode: "turn",
      querystring: [""],
      handlingfunc: controlfunc_lightpower
    }
  },
  currentvariables: {}
  },
  {
    deviceid: 6,
    devicename: "無限鏡",
  isAvailable: true,
    devicenamecandidates: ["鏡", "かがみ", "カガミ", "ミラー", "mirror", "無限", "回廊", "infinity"],
    baseUrl: "https://developer-api.govee.com/v1/devices/control",
    method: "PUT",
  headers: {"Govee-API-Key" : "d3a90cc5-12c1-45af-9d84-1f48aaa854b2", "Content-Type" : "application/json"},
  requestBody: '{"device":"B9:49:D4:AD:FC:32:FA:1A","model":"H619Z","cmd":{"name":"{{0}}","value":{{1}}}}',
    commands: {
    brightness:{
      keywords: ["明る", "暗く", "あかる", "くらく", "ライト", "らいと", "眩し", "まぶし", "bright", "light", "ブライトネス", "ぶらいとねす", "シャイニーネス", "ダーク", "ダーカー", "dark"],
        finishMessage: "明るさを{{0}}",
      commandcode: "brightness",
      querystring: [""],
      handlingfunc: controlfunc_brightness
    },
    color:{
      keywords: ["Red", "red", "赤", "あか", "レッド", "れっど", "緋", "Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ", "Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん", "Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる","Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー", "Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん","Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー", "どどめ", "ドドメ", "redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂",
      "Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー", "金色", "きんいろ", "キンイロ", "ごーるど", "ゴールド", "ゴールデン", "Gold", "gold", "Pink", "pink", "ピンク", "ぴんく", "桃", "もも",
      "濃く", "濃ゆく", "こく", "こゆく", "うすく", "薄く", "薄め", "うすめ", "あわく", "淡く", "Vivid", "vivid", "pale", "Pale", "Stale", "stale"],
        finishMessage: "色を{{0}}",
      commandcode: "color",
      querystring: [""],
      handlingfunc: controlfunc_color
    },
    power:{
      keywords: ["消して", "消す", "消せ", "けせ", "けす", "けして", "つけろ", "つける", "付ける", "点灯", "消灯", "turn on", "turn fountain off", "turn fountain on", "turn off", "オン", "オフ"],
        finishMessage: "{{0}}",
      commandcode: "turn",
      querystring: [""],
      handlingfunc: controlfunc_lightpower
    }
  },
  currentvariables: {}
  });

// 共通コマンドメソッド「明るさ変更」。このようにデバイス固有処理でも複数デバイスで同一共通動作をする場合など外部メソッドにすることでコードを分かりやすくできます。
function controlfunc_brightness(device, message){
  var oppositeflag = false;
  var numericmatch = message.match("\\d+");
  if (numericmatch && numericmatch.index){
      device.currentvariables.brightness = numericmatch[0];
      return { value: numericmatch[0], message: numericmatch[0] + "にする" };
  }
  // 「明るすぎる」のような場合は逆、暗くしたいととらえます。
  if (foundInArray(message, ["すぎ", "過ぎ", "ない", "too"])){
      oppositeflag = true;
  }
  var currentbrightness = device.currentvariables.brightness ? device.currentvariables.brightness : 50;
  var brigher = foundInArray(message, ["明", "あか", "らいと", "シャイニ", "Light", "bright", "ぶらいと"]) && true;
  if (currentbrightness <= 10){
      currentbrightness = currentbrightness + (brigher ^ oppositeflag ? 1 : -1);
  } else {
      currentbrightness = currentbrightness + (brigher ^ oppositeflag ? 10 : -10);
  }
  currentbrightness = currentbrightness > 100 ? 100 : currentbrightness;
  currentbrightness = currentbrightness < 0 ? 0 : currentbrightness;
  device.currentvariables.brightness = currentbrightness;
    return { value: currentbrightness, message: (brigher ^ oppositeflag ? "明るく" : "暗く")};
}

// 共通コマンドメソッド「色変更」。このようにデバイス固有処理でも複数デバイスで同一共通動作をする場合など外部メソッドにすることでコードを分かりやすくできます。
function controlfunc_color(device, message){
  // 「今の色」を取得し、特定の直接指定色以外は差分から変更する色を計算します。
    var currenthsl = device.currentvariables ? device.currentvariables : {h: 220, s: 83, l: 50};
  currenthsl.h=currenthsl.h?currenthsl.h:220;
  currenthsl.s=currenthsl.s?currenthsl.s:83;
  currenthsl.l=currenthsl.l?currenthsl.l:50;
  // 指定された色
  var targetpoint = 0;
  // 計算後の明度の微調整
  var extrataste = 0;
  // 彩度の調整値
  var saturationtweak = 0;
  var messagecolor = "";
  // 各色ごとの対応。赤、ピンク、緑、金色は固有の値でないとそれらしくならないので直接指定、それ以外は対応する色相の値を持ち、それに近づけるようにします。
  // 「グリーン」より先に「ライトグリーン」、「きいろ」より先に「むらさきいろ」が来るようにするなど、重複する名前で処理が飛ばされないように順番を考慮する必要があります。
  if (foundInArray(message, ["Red", "red", "赤", "あか", "レッド", "れっど", "緋"])){
      device.currentvariables = {h: 1, s: 100, l: 48};
      return { value: '{"r":245,"g":4,"b":0}', message: "赤く"};
  } else if (foundInArray(message, ["Pink", "pink", "ピンク", "ぴんく", "桃", "もも"])){
      device.currentvariables = {h: 342, s: 93, l: 84};
      return { value: '{"r":252,"g":176,"b":199}', message: "ピンク色に"};
  } else if (foundInArray(message, ["Orange", "orange", "橙", "だいだい", "オレンジ", "おれんじ"])){
      targetpoint = 25;
    messagecolor = "オレンジ色に";
  } else if (foundInArray(message, ["Lime", "lime", "lghtgreen", "黄緑", "きみどり", "ライトグリーン", "らいとぐりーん"])){
      targetpoint = 93;
    messagecolor = "きみどり色に";
  } else if (foundInArray(message, ["Purple", "purple", "紫", "ムラサキ", "むらさき", "あお", "海老", "えびちゃ", "エビ", "パープル", "ぱーぷる"])){
      targetpoint = 276;
    messagecolor = "紫色に";
  } else if (foundInArray(message, ["Yellow", "yellow", "黄", "きいろ", "イエロー", "いえろー"])){
      targetpoint = 60;
    messagecolor = "黄色く";
  } else if (foundInArray(message, ["Green", "green", "Viridian", "viridian", "緑", "翠", "碧", "みどり", "ビリジアン", "グリーン", "ぐりーん"])){
      device.currentvariables = {h: 138, s: 47, l: 35};
      return { value: '{"r":47,"g":131,"b":72}', message: "緑色に"};
  } else if (foundInArray(message, ["Cyan", "cyan", "lightblue", "LightBlue", "水", "みず", "シアン", "トルマリン", "しあん", "ライトブルー", "らいとぶるー"])){
      targetpoint = 180;
    messagecolor = "水色に";
  } else if (foundInArray(message, ["どどめ", "ドドメ"])){
      targetpoint = 284;
    messagecolor = "ドドメ色に";
      saturationtweak = -10;
      extrataste = -10;
  } else if (foundInArray(message, ["redpurple", "Redpurple", "purplered", "PurpleRed", "えんじ", "赤紫", "エンジ", "槐", "臙脂"])){
      targetpoint = 311;
    messagecolor = "えんじ色に";
      saturationtweak = -10;
      extrataste = -10;
  } else if (foundInArray(message, ["Blue", "blue", "sky", "青", "蒼", "藍", "あお", "靑", "アオ", "ブルー"])) {
      targetpoint = 232;
    messagecolor = "青く";
  } else if (foundInArray(message, ["Gold", "gold", "金", "きん", "ゴール", "ごーる", "蒼", "藍", "あお", "靑", "アオ", "ブルー"])) {
      device.currentvariables = {h: 49, s: 100, l: 52};
      return { value: '{"r":255,"g":210,"b":10}', message: "金色にする"};
  }
  if(foundInArray(message, ["濃", "こく", "こい", "こゆく", "Vivid", "vivid"])){
      saturationtweak += 20;
    messagecolor += "濃く";
  } else if (foundInArray(message, ["うすく", "うすい", "薄", "あわく", "淡", "pale", "Pale", "Stale", "stale"])){
      saturationtweak -= 20;
    messagecolor += "薄く";
  }
  var huegap = Math.abs(360 - currenthsl.h + targetpoint) %360;
  if (huegap < 10) {
      currenthsl.h = targetpoint;
    currenthsl.l = Math.abs(currenthsl.l + extrataste - 50) > 10 ? (currenthsl.l + extrataste - parseInt(Math.abs(currenthsl.l - 50)/10)) : 50 + extrataste;
    if (saturationtweak == 0) {
        currenthsl.s = 100;
    }
  } else {
      currenthsl.h = (360 + targetpoint - Math.abs(360 - currenthsl.h - targetpoint) %360/10)%360;
      currenthsl.l = (100 +(Math.abs(currenthsl.l - 72) > 10 ? (72 - (Math.abs(currenthsl.l - 72)/10)) : 72) + extrataste)%100;
  }
  currenthsl.s += saturationtweak;
  if (currenthsl.s > 100) currenthsl.s = 100;
  if (currenthsl.s < 5) currenthsl.s = 5;
    device.currentvariables = currenthsl;
  // 最終的な出力（APIへの色指定）はRGBのため（※GOVEEのデバイスの場合）、RGB値を計算します。
  var convertedrgb = HSLtoRGB(currenthsl.h, currenthsl.s, currenthsl.l);
  // 出力するRGB値とメッセージをそれぞれ持ったオブジェクトを返します。
  return { value: '{"r":' + convertedrgb.r + ',"g":' + convertedrgb.g + ',"b":' + convertedrgb.b + '}', message: messagecolor};
}

// 共通コマンドメソッド「オンオフ」。このようにデバイス固有処理でも複数デバイスで同一共通動作をする場合など外部メソッドにすることでコードを分かりやすくできます。
function controlfunc_lightpower(device, message){
  var turnon = !foundInArray(message, ["消して", "消す", "けせ", "けし", "消", "off", "オフ"]);
  return {value: turnon ? '"on"' : '"off"', message: turnon ? "点灯" : "消灯"}
}

// 共通コマンドメソッド「動作」。このようにデバイス固有処理でも複数デバイスで同一共通動作をする場合など外部メソッドにすることでコードを分かりやすくできます。
function controlfunc_move(device, message){
  // 他デバイスと共通処理に組み込むのがめんどくさくなったため直接APIコール。
  postMessage('{"command":"turnOn","parameter":"default","commandType":"command"}', "https://api.switch-bot.com/v1.0/devices/DBED25908D5F/commands");
  // 戻り値を空にすることで共通API呼び出しをスキップしてメッセージだけ表示します。
    return {value: {}, message: "ペンデュラムを振り直す"};
}

// 共通処理色相・彩度・輝度→RGB
function HSLtoRGB(h, s, l){
  h=h?h:0;
  s=s?s:0;
  l=l?l:0;
  h = parseFloat(h);
  s = parseFloat(s);
  l = parseFloat(l);
  if( h<0 ) h=0;
  if( s<0 ) s=0;
  if( l<0 ) l=0;
  if( h>=360 ) h=359;
  if( s>100 ) s=100;
  if( l>100 ) l=100;
  s/=100;
  l/=100;
  C = (1-Math.abs(2*l-1))*s;
  hh = h/60;
  X = C*(1-Math.abs(hh%2-1));
  r = g = b = 0;
  if( hh>=0 && hh<1 ){r = C;g = X;}
  else if( hh>=1 && hh<2 ){r = X;g = C;}
  else if( hh>=2 && hh<3 ){g = C;b = X;}
  else if( hh>=3 && hh<4 ){g = X;b = C;}
  else if( hh>=4 && hh<5 ){r = X;b = C;}
  else{r = C;b = X;}
  r += l-C/2;
  g += l-C/2;
  b += l-C/2;
  r *= 255.0;
  g *= 255.0;
  b *= 255.0;
  return ({r: Math.round(r), g: Math.round(g), b: Math.round(b)});
}
