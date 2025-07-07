document.getElementById('csvFile').addEventListener('change', function(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  const outputDiv = document.getElementById('output');
  const fileNameDisplay = document.getElementById('fileNameDisplay'); // ファイル名表示要素
  const processingMessage = document.getElementById('processingMessage'); // 処理中メッセージ要素

  // ファイル選択時のUI更新
  outputDiv.innerHTML = ''; // 前回の結果をクリア
  if (file) {
    fileNameDisplay.textContent = `選択されたファイル: ${file.name}`; // ファイル名を表示
    processingMessage.style.display = 'block'; // 処理中メッセージを表示
    processingMessage.textContent = '処理中...'; // テキストをセット
  } else {
    fileNameDisplay.textContent = '';
    processingMessage.style.display = 'none'; // ファイルが選択されなかったら隠す
    return; // ファイルがない場合はここで終了
  }


  reader.onload = function(e) {
    console.log("FileReader onload イベント発火");
    const csvData = e.target.result;
    console.log("csvData (最初の500文字):", csvData.substring(0, 500));

    const lines = csvData.split('\n');
    console.log("lines の数:", lines.length);
    const resultRows = [];
    let currentKaigishitsu = null;

    // ヘッダー行を処理
    if (lines.length > 0) {
        const headerRow = lines[0].split(',');
        console.log("元のヘッダー行:", headerRow);
        headerRow.unshift('会議室名'); // ヘッダーに会議室名を追加
        resultRows.push(headerRow.join(','));
        console.log("変換後のヘッダー行:", resultRows[0]);
    } else {
        console.warn("CSVファイルにヘッダー行がありません。");
        outputDiv.innerHTML = '<p class="error-message">エラー: CSVファイルにヘッダー行がありません。</p>';
        processingMessage.style.display = 'none'; // 処理中メッセージを隠す
        return; // 処理を中断
    }

    // データ行を処理
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');

      // 行が空でないことを確認
      if (row.length === 1 && row[0].trim() === "") { // trim()で空白のみの行も除外
          // console.log(`行 ${i}: 空行のためスキップ`);
          continue;
      }
      //console.log(`行 ${i}:`, row); // デバッグ用ログはコメントアウトまたは削除
      //console.log(`行 ${i}: row[0]=`, row[0], `row[1]=`, row[1]); // デバッグ用ログ

      // 施設備品名（会議室名）がある場合、現在の会議室名を更新 (元のロジックを維持+判定強化)
      // row[1]に「会議室」を含み、かつrow[2]以降がデータのように見えない行を会議室名行と判定
      if (row.length > 1 && row[1].includes('会議室') && (row.length <= 2 || row[2].trim() === '')) {
         currentKaigishitsu = row[1].trim(); // 前後の空白を削除
         console.log(`行 ${i}: 会議室名を検出 - ${currentKaigishitsu}`);
         continue; // 会議室名のみの行はスキップ
      }

      // 予約情報がある行に会議室名を追加
      // 会議室名が取得済みで、行の長さが十分あり、かつ開始日（row[2]）が空でないことを確認
      if (currentKaigishitsu && row.length > 2 && row[2].trim() !== "") { // 開始日が空でないか確認
        const converted_row = [currentKaigishitsu].concat(row); // 先頭に追加
        resultRows.push(converted_row.join(','));
        // console.log(`行 ${i}: 予約情報に会議室名を追加`); // デバッグ用ログ
      } else {
          // console.log(`行 ${i}: 予約情報ではない、または会議室名が未取得、または開始日が空のためスキップ`); // デバッグ用ログ
      }
    }
    console.log("データ行の処理完了");
    console.log("resultRows の数 (ヘッダー含む):", resultRows.length);

    // ヘッダー行しか結果がない場合のエラー処理
    if (resultRows.length <= 1) {
        outputDiv.innerHTML = '<p class="error-message">エラー: 変換対象の予約データが見つかりませんでした。</p>';
        processingMessage.style.display = 'none'; // 処理中メッセージを隠す
        return; // 処理を中断
    }

    // 変換されたCSVデータを文字列として取得し、引用符(")を削除 
    let outputCsvData = resultRows.join('\n');
    // 引用符(")を削除する処理を追加
    outputCsvData = outputCsvData.replace(/"/g, '');
    console.log("outputCsvData (最初の500文字):", outputCsvData.substring(0, 500));

    // 変換されたCSVデータをBlobとして生成し、ダウンロードリンクを作成
    try {
        // ★★★ ここで HTML で読み込んだ encoding.min.js ライブラリを使用 ★★★
        
        if (typeof Encoding === 'undefined') {
             //念のため、ここでもライブラリ読み込み失敗をチェック
             outputDiv.innerHTML = '<p class="error-message">エラー: Shift-JIS変換ライブラリ (encoding.min.js) が読み込まれていません。<br>ファイルが正しく配置されているか確認してください。</p>';
             console.error("Shift-JIS変換ライブラリ (encoding.min.js) が利用できません。");
             processingMessage.style.display = 'none'; // 処理中メッセージを隠す
             return; // 処理を中断
        }

        console.log("encoding.min.js を使用してShift-JIS変換を実行します...");
        // stringToCode で文字列をUTF-8のコード配列に変換
        const utf8Array = Encoding.stringToCode(outputCsvData);
        // convert で UTF-8コード配列をShift-JISコード配列に変換
        const sjisArray = Encoding.convert(utf8Array, {
            to: 'SJIS',
            from: 'UNICODE' // stringToCodeはUNICODEとして扱えるデータ構造を返す
        });

        // Uint8Array に変換 (Blob作成に必要)
        const sjisUint8Array = new Uint8Array(sjisArray);

        // Shift-JISエンコードされたBlobを生成
        const blob = new Blob([sjisUint8Array], { type: 'text/csv;charset=shift_jis' });
        console.log("Shift-JISでBlobを生成しました");

        // ダウンロードリンクを作成
        console.log("ダウンロードリンクを作成します...");
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'converted_meetings.csv'; // ダウンロード時のファイル名
        downloadLink.textContent = '変換済みCSVファイル（Shift_JIS）をダウンロード';

        // 結果表示エリアに成功メッセージとダウンロードリンクを追加
        outputDiv.innerHTML = '<h2>変換が完了しました！</h2>';
        outputDiv.appendChild(downloadLink);
        console.log("ダウンロードリンクを画面に追加しました。");

    } catch (error) {
        // エラー発生時のUI更新
        outputDiv.innerHTML = '<p class="error-message">エラー: 変換またはファイルダウンロードリンク生成中にエラーが発生しました。<br>詳細: ' + error.message + '</p>';
        console.error("変換またはファイルのダウンロードリンク生成中にエラー:", error);
    } finally {
        // 処理完了後、必ず処理中メッセージを隠す
        processingMessage.style.display = 'none';
    }
  };

  reader.onerror = function(e) {
      console.error("FileReader error:", e);
      const outputDiv = document.getElementById('output');
      // エラー発生時のUI更新
      outputDiv.innerHTML = '<p class="error-message">エラー: ファイルの読み込み中にエラーが発生しました。</p>';
      processingMessage.style.display = 'none'; // 処理中メッセージを隠す
      fileNameDisplay.textContent = ''; // ファイル名表示をクリア
  };

  // 入力はShift_JISで読み込む 
  console.log("ファイルをShift_JISで読み込み開始...");
  reader.readAsText(file, 'Shift_JIS');
});
