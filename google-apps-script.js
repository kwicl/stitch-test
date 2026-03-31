// ============================================================
// SMART EXPENSES — Google Apps Script (VERSION 2.0)
// ============================================================
// INSTRUCTIONS :
// 1. Copiez ce code dans votre éditeur Google Apps Script.
// 2. Cliquez sur "Déployer" → "Nouveau déploiement".
// 3. Type : Application Web.
// 4. Exécuter en tant que : "Moi" (votre compte).
// 5. Qui a accès : "Tout le monde" (indispensable).
// 6. Copiez l'URL générée et mettez-la dans vos fichiers HTML.
// ============================================================

function doGet(e) {
  var action = e.parameter.action;
  var sheet = getTargetSheet();
  
  if (action === 'getAll') {
    return getAllTransactions(sheet);
  }
  
  return jsonResponse({ success: false, error: 'Action GET inconnue' });
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = getTargetSheet();
    var action = data.action;

    console.log("Action reçue: " + action + " - ID: " + data.id);

    if (action === 'addTransaction') {
      return addTransaction(sheet, data);
    }
    if (action === 'updateTransaction') {
      return updateTransaction(sheet, data);
    }
    if (action === 'deleteTransaction') {
      return deleteTransaction(sheet, data);
    }

    return jsonResponse({ success: false, error: 'Action POST inconnue: ' + action });
  } catch (err) {
    console.error("Erreur doPost: " + err.toString());
    return jsonResponse({ success: false, error: "Erreur serveur: " + err.toString() });
  }
}

// Sélectionner la première feuille quels que soient les onglets
function getTargetSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // On prend toujours la première feuille
  return sheet;
}

function addTransaction(sheet, data) {
  var id = Utilities.getUuid();
  var montant = data.montant !== '' && data.montant != null ? data.montant : '';
  var income = data.income !== '' && data.income != null ? data.income : '';
  var sousCat = data.sous_categorie || data.paiement || '';
  
  var row = [
    id,
    data.date || '',
    montant,
    income,
    data.categorie || '',
    sousCat,
    (data.lieu || '') + (data.lieu && data.description ? ' — ' : '') + (data.description || '')
  ];
  
  sheet.appendRow(row);
  return jsonResponse({ success: true, action: 'add', id: id });
}

function updateTransaction(sheet, data) {
  var id = String(data.id);
  if (!id) return jsonResponse({ success: false, error: 'ID manquant' });

  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      var rowIndex = i + 1;
      var montant = data.montant !== '' && data.montant != null ? data.montant : '';
      var income = data.income !== '' && data.income != null ? data.income : '';
      var sousCat = data.sous_categorie || data.paiement || '';
      
      var newRow = [
        id,
        data.date || '',
        montant,
        income,
        data.categorie || '',
        sousCat,
        (data.lieu || '') + (data.lieu && data.description ? ' — ' : '') + (data.description || '')
      ];
      
      sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
      return jsonResponse({ success: true, action: 'update', id: id });
    }
  }
  return jsonResponse({ success: false, error: 'ID ' + id + ' non trouvé dans la colonne A' });
}

function deleteTransaction(sheet, data) {
  var id = String(data.id);
  var rows = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ success: true, action: 'delete', id: id });
    }
  }
  return jsonResponse({ success: false, error: 'ID ' + id + ' non trouvé' });
}

function getAllTransactions(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return jsonResponse({ success: true, data: [] });
  
  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row, idx) {
    if (!row[0]) {
       row[0] = Utilities.getUuid();
       sheet.getRange(idx + 2, 1).setValue(row[0]);
    }
    
    return {
      id: String(row[0]),
      date: row[1],
      montant: row[2],
      income: row[3],
      categorie: row[4],
      sous_categorie: row[5],
      description: row[6]
    };
  })
  .filter(function(t) { return t.date || t.montant || t.income; })
  .reverse(); // ✅ On inverse pour avoir les plus récents (bas du sheet) en premier
  
  return jsonResponse({ success: true, data: result });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// FIN DU SCRIPT
// ============================================================
