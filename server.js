/**
 * API Backend para o Sistema Disk Marmitas
 * * Tecnologias: Node.js, Express, Firebase Admin SDK
 * Função: Gerir o cardápio, definições e estado da loja via HTTP.
 * * * Como usar localmente:
 * 1. npm install
 * 2. Coloca o 'serviceAccountKey.json' na raiz.
 * 3. node server.js
 * * * Como usar na Cloud (Render/Railway):
 * 1. Define a variável de ambiente FIREBASE_SERVICE_ACCOUNT com o conteúdo do JSON.
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const bodyParser = require('body-parser');

// Inicialização do Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); 
app.use(bodyParser.json());

// --- CONFIGURAÇÃO DO FIREBASE ADMIN ---
try {
    let serviceAccount;

    // 1. Tenta ler da Variável de Ambiente (Produção/Cloud)
    // Isto é mais seguro para hospedagem online (ex: Render)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log("✅ Credenciais carregadas via Variável de Ambiente.");
    } 
    // 2. Tenta ler do ficheiro local (Desenvolvimento)
    else {
        serviceAccount = require('./serviceAccountKey.json');
        console.log("✅ Credenciais carregadas via ficheiro local.");
    }
    
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    
} catch (error) {
    console.error("⚠️ CRÍTICO: Não foi possível carregar as credenciais do Firebase.");
    console.error("Certifica-te de que o ficheiro 'serviceAccountKey.json' existe ou a variável 'FIREBASE_SERVICE_ACCOUNT' está definida.");
    console.error("Erro:", error.message);
    // Não encerramos o processo imediatamente para permitir diagnóstico, mas a DB falhará.
}

// Inicializa Firestore apenas se o admin estiver configurado
const db = admin.apps.length ? admin.firestore() : null;

// Caminho do documento no Firestore
// IMPORTANTE: Deve corresponder ao caminho usado no teu ficheiro index.html
// Se usaste a versão simplificada no HTML, mantém este.
// Se usaste a versão 'artifacts/...', altera aqui.
const DOC_PATH = 'configuracoes/menu'; 

// ==========================================
// ROTAS DA API
// ==========================================

// Rota de teste simples para saber se o servidor está online
app.get('/', (req, res) => {
    res.send('Backend Disk Marmitas está Online! 🚀');
});

/**
 * GET /api/menu
 * Retorna todos os dados do cardápio
 */
app.get('/api/menu', async (req, res) => {
    if (!db) return res.status(500).json({ erro: 'Base de dados não conectada.' });

    try {
        const doc = await db.doc(DOC_PATH).get();
        if (!doc.exists) return res.status(404).json({ erro: 'Configuração não encontrada.' });
        res.json(doc.data());
    } catch (error) {
        console.error("Erro:", error);
        res.status(500).json({ erro: 'Erro interno no servidor.' });
    }
});

/**
 * PUT /api/menu
 * Atualiza o cardápio completo
 * Espera um JSON completo no corpo da requisição
 */
app.put('/api/menu', async (req, res) => {
    if (!db) return res.status(500).json({ erro: 'Base de dados não conectada.' });
    
    const novosDados = req.body;
    
    // Validação básica para garantir que não estamos a apagar dados importantes
    if (!novosDados || !novosDados.categories) {
        return res.status(400).json({ erro: 'Dados inválidos. O objeto deve conter "categories".' });
    }

    try {
        await db.doc(DOC_PATH).set(novosDados);
        res.json({ mensagem: 'Menu atualizado com sucesso!' });
    } catch (error) {
        console.error("Erro ao gravar:", error);
        res.status(500).json({ erro: 'Erro ao gravar dados na base de dados.' });
    }
});

/**
 * PATCH /api/status-loja
 * Rota rápida para abrir/fechar a loja
 * Espera: { "isOpen": true } ou { "isOpen": false }
 */
app.patch('/api/status-loja', async (req, res) => {
    if (!db) return res.status(500).json({ erro: 'Base de dados não conectada.' });

    const { isOpen } = req.body;
    
    if (typeof isOpen !== 'boolean') {
        return res.status(400).json({ erro: "O campo 'isOpen' deve ser booleano (true ou false)." });
    }

    try {
        // Atualiza apenas o campo específico sem sobrescrever o resto
        await db.doc(DOC_PATH).update({ 'settings.isOpen': isOpen });
        res.json({ 
            mensagem: `Loja ${isOpen ? 'ABERTA' : 'FECHADA'} com sucesso.`,
            estado: isOpen
        });
    } catch (error) {
        res.status(500).json({ erro: 'Erro ao atualizar estado.' });
    }
});

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`\nServidor a correr na porta ${PORT}`);
    console.log(`Testar localmente: http://localhost:${PORT}/api/menu`);
});
