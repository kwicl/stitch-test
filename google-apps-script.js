// ============================================================
// SMART EXPENSES — Google Apps Script
// Copiez-collez ce code dans votre Apps Script Google
// puis cliquez sur "Déployer" → "Gérer les déploiements"
// → sélectionnez votre déploiement → Modifier → Nouvelle version
// ============================================================

function doGet(e) {
  var action = e.parameter.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  if (action === 'getAll') {
    return getAllTransactions(sheet);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ success: false, error: 'Action inconnue' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (data.action === 'addTransaction') {
      return addTransaction(sheet, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: 'Action inconnue' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function addTransaction(sheet, data) {
  // Générer un ID unique
  var id = Utilities.getUuid();

  // ✅ La sous-catégorie remplace le moyen de paiement (colonne F)
  // On accepte les deux noms de champs pour la compatibilité
  var sousCat = data.sous_categorie || data.paiement || '';

  // ✅ Routage correct des montants :
  // - Dépense → colonne C (montant)
  // - Revenu  → colonne D (income)
  var montant = data.montant !== '' && data.montant != null ? data.montant : '';
  var income  = data.income  !== '' && data.income  != null ? data.income  : '';

  // Construire la ligne dans l'ordre exact des colonnes du sheet :
  // A: ID | B: Date | C: Montant dépensé | D: Income | E: Catégorie | F: Sous-catégorie | G: Description
  var row = [
    id,                          // A — ID
    data.date || '',             // B — Date
    montant,                     // C — Montant dépensé (vide si revenu)
    income,                      // D — Income / Revenu (vide si dépense)
    data.categorie || '',        // E — Catégorie
    sousCat,                     // F — Sous-catégorie ← (anciennement Moyen de paiement)
    (data.lieu || '') + (data.lieu && data.description ? ' — ' : '') + (data.description || '')  // G — Description
  ];

  sheet.appendRow(row);

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, id: id }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAllTransactions(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var rows = data.slice(1);

  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      obj[String(h).toLowerCase().trim()] = row[i];
    });

    // Normaliser les noms de champs pour l'app
    return {
      id:             obj['id'] || '',
      date:           obj['date'] || '',
      montant:        obj['quel est le montant dépensé?'] || obj['montant'] || '',
      income:         obj['income'] || '',
      categorie:      obj['quelle est la catégorie de la dépense?'] || obj['catégorie'] || obj['categorie'] || '',
      // ✅ Lire sous_categorie depuis colonne F (anciennement moyen de paiement)
      sous_categorie: obj['sous-catégorie de dépense'] || obj['quel moyen de paiement a été utilisé?'] || obj['sous_categorie'] || obj['paiement'] || '',
      paiement:       obj['sous-catégorie de dépense'] || obj['quel moyen de paiement a été utilisé?'] || obj['sous_categorie'] || obj['paiement'] || '',
      description:    obj['description lieu ou note'] || obj['description'] || obj['lieu'] || '',
      lieu:           obj['description lieu ou note'] || obj['lieu'] || '',
    };
  }).filter(function(t) {
    // Filtrer les lignes vides
    return t.date || t.montant || t.income;
  });

  return ContentService
    .createTextOutput(JSON.stringify({ success: true, data: result }))
    .setMimeType(ContentService.MimeType.JSON);
}
