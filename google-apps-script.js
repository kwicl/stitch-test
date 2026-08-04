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
  
  if (action === 'deduplicate') {
    return jsonResponse({ success: true, result: removeDuplicatesInSheet(sheet) });
  }
  
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
  var id = data.id ? String(data.id) : Utilities.getUuid();
  
  // Anti-duplication : si l'ID est déjà présent, on fait un update à la place
  if (data.id) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.id)) {
        return updateTransaction(sheet, data);
      }
    }
  }

  var montant = data.montant !== '' && data.montant != null ? data.montant : '';
  var income = data.income !== '' && data.income != null ? data.income : '';
  var sousCat = data.sous_categorie || data.paiement || '';
  var dateVal = parseInputDate(data.date);
  
  // Anti-duplication basée sur les données : on évite d'ajouter la même transaction
  var allRows = sheet.getDataRange().getValues();
  var reqDateTime = dateVal.getTime();
  for (var j = 1; j < allRows.length; j++) {
    var r = allRows[j];
    var rDate = r[1] instanceof Date ? r[1].getTime() : new Date(r[1]).getTime();
    if (rDate === reqDateTime && 
        String(r[2]) === String(montant) && 
        String(r[3]) === String(income) && 
        String(r[4]) === String(data.categorie || '')) {
      return jsonResponse({ success: true, action: 'skip_duplicate', id: r[0], message: 'Transaction ignorée car identique existante.' });
    }
  }
  
  var row = [
    id,
    dateVal,
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
      var dateVal = parseInputDate(data.date);
      
      var newRow = [
        id,
        dateVal,
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
  
  // Si non trouvé mais qu'on demandait un update, on considère que c'est peut-être un nouvel ajout qui a perdu son ID
  // ou on renvoie une erreur explicite. Ici on reste sur l'erreur pour débogage.
  return jsonResponse({ success: false, error: 'ID ' + id + ' non trouvé' });
}

// Fonction utilitaire pour parser les dates reçues (format yyyy-mm-dd)
function parseInputDate(dateStr) {
  if (!dateStr) return new Date();
  try {
    var parts = dateStr.split('-');
    if (parts.length === 3) {
      // Les mois dans JS commencent à 0
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date(dateStr);
  } catch(e) { return new Date(); }
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
  // Auto-nettoyage des doublons au moment de lire
  removeDuplicatesInSheet(sheet);

  var range = sheet.getDataRange();
  var values = range.getValues();
  var displayValues = range.getDisplayValues(); // ✅ Pour lire les dates telles qu'affichées
  
  if (values.length < 1) return jsonResponse({ success: true, data: [] });
  
  var headers = values[0];
  var rows = values.slice(1);
  var dispRows = displayValues.slice(1);
  
  var result = rows.map(function(row, idx) {
    if (!row[0]) {
       row[0] = Utilities.getUuid();
       sheet.getRange(idx + 2, 1).setValue(row[0]);
    }
    
    // On prend la date affichée (colonne B / index 1) pour éviter les décalages de Timezone
    var dateVal = dispRows[idx][1]; 
    
    return {
      id: String(row[0]),
      date: dateVal, // ✅ String formaté type "2026-04-01" ou "01/04/2026"
      montant: row[2],
      income: row[3],
      categorie: row[4],
      sous_categorie: row[5],
      description: row[6]
    };
  })
  .filter(function(t) { return t.date || t.montant || t.income; });
  
  // Tri chronologique décroissant fort (du plus récent au plus ancien)
  result.sort(function(a, b) {
    var da = parseInputDate(a.date).getTime();
    var db = parseInputDate(b.date).getTime();
    return db - da; // Décroissant
  });
  
  return jsonResponse({ success: true, data: result });
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function removeDuplicatesInSheet(sheet) {
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return { duplicatesRemoved: 0 };
  
  var uniqueRows = [];
  var seen = {};
  var headers = values[0];
  uniqueRows.push(headers);
  var duplicatesCount = 0;
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var dateStr = row[1] instanceof Date ? row[1].getTime() : row[1];
    var key = dateStr + "|" + row[2] + "|" + row[3] + "|" + row[4]; // Date + Montant + Type + Categorie
    
    if (seen[key]) {
      duplicatesCount++;
    } else {
      seen[key] = true;
      uniqueRows.push(row);
    }
  }
  
  if (duplicatesCount > 0) {
    sheet.clearContents();
    sheet.getRange(1, 1, uniqueRows.length, uniqueRows[0].length).setValues(uniqueRows);
  }
  return { duplicatesRemoved: duplicatesCount };
}

// ============================================================
// FIN DU SCRIPT
// ============================================================


function cleanCategories() {
  var sheet = getTargetSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();

  var mapping = {
    "Bien etre": "Bien-�tre",
    "Villa Camelia ici": "Villa Camelia icl",
    "Education enfant": "�ducation enfant",
    "Electrom�nagers": "�lectrom�nagers",
    "Appartements kENITRA icl": "appartement KENITRA",
    "Appartements KENITRA ici": "appartement KENITRA",
    "Appartement Casa icl": "appartement CASA",
    "Maison et frais de services": "Maison et frais de service",
    "D�placement de travail": "D�placement"
  };

  var changes = 0;
  var colEIndex = 4; // Index 4 = Colonne E

  for (var i = 1; i < values.length; i++) {
    var cat = values[i][colEIndex];
    if (typeof cat === 'string') {
      cat = cat.trim();
      if (mapping[cat]) {
        values[i][colEIndex] = mapping[cat];
        changes++;
      }
    }
  }

  if (changes > 0) {
    range.setValues(values);
  }

  Logger.log("Changements effectu�s sur la colonne E : " + changes);
}
