' 変数を宣言し、引数を取得する
Dim subject : subject = WScript.Arguments(0)
Dim text : text = WScript.Arguments(1)
Dim send_to : send_to = WScript.Arguments(2)
Dim send_cc : send_cc = WScript.Arguments(3)
Dim send_bcc : send_bcc = WScript.Arguments(4)
Dim status : status = 0

' エラー発生時に処理を継続
On Error Resume Next

' Notesのセッションを起動する
Set wkNSes = CreateObject("Notes.NotesSession")

' NotesDatabaseオブジェクトを作成し、そのデータベースを開く
Set wkNDB = wkNSes.GETDATABASE("", "")

' NotesDBをユーザーのメールDBに割り当てた後に開く
wkNDB.OpenMail

' NotesDBに文書を作成し、新規文書をオブジェクト変数にセットする
Set wkNDoc = wkNDB.CREATEDOCUMENT()

' 件名をセットする
wkNDoc.subject = subject

' 宛先をセットする
send_to = Replace(send_to, VbLf, "HIJIKI_GOHAN")
send_to = Replace(send_to, VbLf, "HIJIKI_GOHAN")
send_to = Replace(send_to, VbCrLf, "HIJIKI_GOHAN")
wkNDoc.sendto = Split(send_to, "HIJIKI_GOHAN")

' CCをセットする
send_cc = Replace(send_cc, VbLf, "HIJIKI_GOHAN")
send_cc = Replace(send_cc, VbLf, "HIJIKI_GOHAN")
send_cc = Replace(send_cc, VbCrLf, "HIJIKI_GOHAN")
wkNDoc.copyto = Split(send_cc, "HIJIKI_GOHAN")

' BCCをセットする
send_bcc = Replace(send_bcc, VbLf, "HIJIKI_GOHAN")
send_bcc = Replace(send_bcc, VbLf, "HIJIKI_GOHAN")
send_bcc = Replace(send_bcc, VbCrLf, "HIJIKI_GOHAN")
wkNDoc.blindCopyTo = Split(send_bcc, "HIJIKI_GOHAN")

' 文書にリッチテキストアイテムを作成する
Set wkNRtItem = wkNDoc.CreateRichTextItem("BODY")
wkNRtItem.APPENDTEXT text

' メールを送信する
wkNDoc.Send False

' オブジェクト変数を解放する
Set wkNRtItem = Nothing
Set wkNDoc = Nothing
Set wkNDB = Nothing
Set wkNSes = Nothing

' ステータスを返す
WScript.Quit status