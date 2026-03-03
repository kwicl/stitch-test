// ============================================================
// Smart Expenses — Google Apps Script API
// ⚠️  CE CODE VA DANS : Google Sheets > Extensions > Apps Script
// ============================================================

// ⚠️ IMPORTANT : Changez "Feuille 1" par le nom exact de votre feuille
// (regardez l'onglet en bas de votre Google Sheet)
const SHEET_NAME = "Feuille 1";

// ── Ces 2 fonctions sont requises par Google ──────────────────
function doGet(e) {
    return handleRequest(e);
}

function doPost(e) {
    return handleRequest(e);
}

// ── Routeur principal ─────────────────────────────────────────
function handleRequest(e) {
    try {
        let action = "";
        let body = {};

        // Détecter si c'est un GET ou POST
        if (e.parameter && e.parameter.action) {
            action = e.parameter.action;
        } else if (e.postData && e.postData.contents) {
            body = JSON.parse(e.postData.contents);
            action = body.action;
        }

        if (action === "addTransaction") {
            return addTransaction(body);
        } else if (action === "getAll") {
            return getAllTransactions();
        } else {
            return respond({ error: "Action inconnue: " + action });
        }

    } catch (err) {
        return respond({ error: err.toString() });
    }
}

// ── AJOUTER une transaction ───────────────────────────────────
function addTransaction(data) {
    const sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(SHEET_NAME);

    if (!sheet) {
        return respond({ error: "Feuille introuvable: " + SHEET_NAME });
    }

    // Créer un ID unique
    const id = Utilities.getUuid();

    // Récupérer les données envoyées depuis l'app
    const date = data.date || new Date().toLocaleDateString("fr-FR");
    const montant = data.montant || 0;
    const income = data.income || "";
    const categorie = data.categorie || "";
    const paiement = data.paiement || "Espèces";
    const desc = data.description || "";
    const lieu = data.lieu || "";

    // Ajouter une ligne dans Google Sheets
    // Ordre des colonnes : ID | Date | Montant | Income | Catégorie | Paiement | Description | Lieu
    sheet.appendRow([id, date, montant, income, categorie, paiement, desc, lieu]);

    return respond({ success: true, message: "Transaction ajoutée !", id: id });
}

// ── LIRE toutes les transactions ──────────────────────────────
function getAllTransactions() {
    const sheet = SpreadsheetApp
        .getActiveSpreadsheet()
        .getSheetByName(SHEET_NAME);

    if (!sheet) {
        return respond({ error: "Feuille introuvable: " + SHEET_NAME });
    }

    const allData = sheet.getDataRange().getValues();

    // S'il n'y a que l'en-tête ou rien
    if (allData.length <= 1) {
        return respond({ success: true, data: [] });
    }

    // Transformer chaque ligne en objet JSON
    const transactions = allData.slice(1).map(function (row) {
        return {
            id: row[0],
            date: row[1],
            montant: row[2],
            income: row[3],
            categorie: row[4],
            paiement: row[5],
            description: row[6],
            lieu: row[7]
        };
    });

    return respond({ success: true, data: transactions });
}

// ── Fonction utilitaire pour renvoyer du JSON ─────────────────
function respond(data) {
    return ContentService
        .createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}
