# ニコニコ生放送コメント連動API起動スクリプト
ニコニコ生放送でのコメントを取得し、API（特に家庭でのスマートデバイスのコントロール）を呼び出すスクリプトです。
現在のところ簡易版ということで対象の配信をPCのブラウザで見る→開発者ウィンドウ（F12）を開く→コンソールにスクリプトを全部張り付けてEnterという使い方のものとなっています。
ファイルはjsファイルですが、実行の際はメモ帳などで開きスクリプトをコピー（もしくはここGitHubのページ上でコピー）後、デバイス部分を上書きしてコンソールに張り付けるだけです。
さすがにこれでは一般利用は厳しいため、サーバー動作版を開発中です。それまでのつなぎ及び各配信者が正式版公開・運用時にどういったことができるのかの思索用のつもりで確認してください。
仕様上はニコニコ動画など生放送でなくても使えると思いますが、意味はないと思います。

スクリプトは @tor4kichi様（ https://qiita.com/tor4kichi ）の「ニコ生配信をアプリで再生」を参考…というか丸パクリさせていただきました。
この場を借りてお礼申し上げます。
https://qiita.com/tor4kichi/items/5c438aa11fea5422103b
https://qiita.com/tor4kichi/items/4df5b11ec564bb8f8d16

スクリプト上部の動作に関する部分がtor4kichi様の丸パクリ、そこに受け付けるコメントと各デバイスの設定を下部に追記したものになります。
使用の際はスクリプト上のコメントに従ってご家庭でお使いのスマートデバイスなどの設定に書き換えてください。

動作をテストするためのHTML、張り付けるためのスクリプトを生成するスクリプト…などがあったほうが便利でしょうが（実際私も超簡素なHTMLで試して作りました）、
そんなところに労力を割くくらいならサーバー動作版をさっさと作るのに力をいれたほうがマシ…ということで多分作りません。各自で空のHTMLに入れて試しましょう。
