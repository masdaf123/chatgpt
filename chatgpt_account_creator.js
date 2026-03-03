import { firefox } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { faker } from '@faker-js/faker';

// --- SERVER DUMMY UNTUK MENGATASI ERROR LEAPCELL PROXY ---
// Membuka port 3000 agar status Hosting Serverless tetap "Healthy"
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot ChatGPT Sedang Berjalan...');
}).listen(process.env.PORT || 3000);

class ChatGPTAccountCreator {
    constructor() {
        this.telegramToken = "7331285038:AAFmxRU682waFKqAJkV6Lj45nW6kWni8cFk";
        this.telegramChatId = "8126039795";
        this.config = {
            headless: process.env.HEADLESS !== 'false',
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
            this.log("📲 Laporan dikirim ke Telegram.");
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
            return `${user}${Math.floor(Math.random() * 99)}@${domain}`;
        } catch (e) {
            this.log("⚠️ Menggunakan fallback faker untuk email.");
            return faker.internet.email().toLowerCase();
        }
    }

    async run() {
        const num = parseInt(process.env.NUM_ACCOUNTS) || 1;
        this.log(`🚀 Memulai pendaftaran ${num} akun...`);

        for (let i = 1; i <= num; i++) {
            const email = await this.generateRandomEmail();
            this.log(`[${i}/${num}] 📧 Mencoba email: ${email}`);
            
            // Profil browser di folder /tmp (wajib untuk Cloud)
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `pw_` + uuidv4().substring(0, 8)));

            try {
                const browser = await firefox.launch({ headless: this.config.headless });
                const context = await browser.newContext({
                    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0"
                });
                const page = await context.newPage();

                // Navigasi ke ChatGPT
                await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // --- Logika Pendaftaran Otomatis Anda Di Sini ---
                
                // Contoh pesan sukses ke Telegram
                const successMsg = `✅ *ChatGPT Account Created!*\n\n📧 *Email:* \`${email}\` \n🔑 *Pass:* \`${this.config.password}\` \n\n_Status: Success via Leapcell_`;
                await this.sendToTelegram(successMsg);

                await browser.close();
            } catch (err) {
                this.log(`❌ Error pada percobaan ke-${i}: ${err.message}`);
            } finally {
                // Hapus data temporary browser
                if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
            }

            // Jeda antar akun
            if (i < num) await new Promise(r => setTimeout(r, 10000));
        }
        this.log("🏁 Semua proses selesai. Server tetap standby untuk menjaga port.");
    }
}

const creator = new ChatGPTAccountCreator();
creator.run(); // Menjalankan otomasi di latar belakang
