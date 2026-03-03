import { firefox } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { faker } from '@faker-js/faker';

// --- 1. SERVER DUMMY (Wajib untuk Hosting Serverless) ---
// Membuat server agar Leapcell tidak memutus koneksi karena port 3000 dianggap mati.
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ChatGPT Creator Bot is Running...');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SYSTEM] Monitoring server active on port ${PORT}`);
});

class ChatGPTAccountCreator {
    constructor() {
        // Menggunakan Token dan Chat ID yang Anda berikan.
        this.telegramToken = "7331285038:AAFmxRU682waFKqAJkV6Lj45nW6kWni8cFk";
        this.telegramChatId = "8126039795";
        this.config = {
            headless: true,
            password: process.env.PASSWORD || "Jembut.789011"
        };
    }

    log(message) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        console.log(`[${timestamp}] ${message}`);
    }

    async sendToTelegram(message) {
        try {
            await fetch(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.telegramChatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
            this.log("📲 Laporan berhasil dikirim ke Telegram.");
        } catch (e) {
            this.log(`❌ Gagal kirim Telegram: ${e.message}`);
        }
    }

    async generateRandomEmail() {
        try {
            const res = await fetch('https://generator.email/');
            const text = await res.text();
            const $ = cheerio.load(text);
            const domains = [];
            $('.e7m.tt-suggestions div > p').each((i, el) => domains.push($(el).text()));
            
            const domain = domains.length > 0 ? domains[Math.floor(Math.random() * domains.length)] : "gmail.com";
            const user = faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = `${user}${Math.floor(Math.random() * 99)}@${domain}`;
            
            this.log(`📧 Email dihasilkan: ${email}`);
            return email;
        } catch (e) {
            this.log("⚠️ Fallback: Menggunakan email acak dari faker.");
            return faker.internet.email().toLowerCase();
        }
    }

    async createAccount(index, total) {
        this.log(`🚀 [${index}/${total}] Memulai proses pendaftaran...`);
        const email = await this.generateRandomEmail();
        const password = this.config.password;
        
        // Menggunakan folder /tmp agar Playwright bisa menulis data di lingkungan Cloud.
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `pw_` + uuidv4().substring(0, 8)));

        try {
            const browser = await firefox.launch({ headless: true });
            const context = await browser.newContext({
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"
            });
            const page = await context.newPage();

            // Navigasi ke ChatGPT.
            await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
            
            // --- LOGIKA OTOMASI PENDAFTARAN ANDA DISINI ---
            
            // Contoh notifikasi jika berhasil.
            const successMsg = `✅ *Akun ChatGPT Berhasil!*\n\n📧 *Email:* \`${email}\` \n🔑 *Pass:* \`${password}\` \n\n_Status: Success via Leapcell_`;
            await this.sendToTelegram(successMsg);

            await browser.close();
        } catch (err) {
            this.log(`❌ Kesalahan pada akun ke-${index}: ${err.message}`);
        } finally {
            // Pembersihan folder temporary.
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }

    async start() {
        const numAccounts = parseInt(process.env.NUM_ACCOUNTS) || 1;
        for (let i = 1; i <= numAccounts; i++) {
            await this.createAccount(i, numAccounts);
            if (i < numAccounts) {
                this.log("⏳ Menunggu 10 detik sebelum pendaftaran berikutnya...");
                await new Promise(r => setTimeout(r, 10000));
            }
        }
        this.log("🏁 Semua tugas selesai. Bot tetap standby di port 3000.");
    }
}

// --- 2. EKSEKUSI ---
const creator = new ChatGPTAccountCreator();
creator.start();

// Mencegah aplikasi mati mendadak yang memicu error "Runtime exited" di Leapcell.
process.on('uncaughtException', (err) => {
    console.error('[CRITICAL ERROR]', err);
});
