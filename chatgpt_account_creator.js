import { firefox } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import * as cheerio from 'cheerio';
import { faker } from '@faker-js/faker';

// --- 1. SERVER DUMMY (Mencegah Error Port 3000 di Leapcell) ---
// Leapcell membutuhkan port aktif agar tidak muncul "Connection Failed".
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ChatGPT Creator Bot is Running...');
}).listen(process.env.PORT || 3000);

class ChatGPTAccountCreator {
    constructor() {
        this.telegramToken = "7331285038:AAFmxRU682waFKqAJkV6Lj45nW6kWni8cFk";
        this.telegramChatId = "8126039795";
        this.config = {
            password: process.env.PASSWORD || "Jembut.789011",
            numAccounts: parseInt(process.env.NUM_ACCOUNTS) || 1
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
                body: JSON.stringify({ chat_id: this.telegramChatId, text: message, parse_mode: 'Markdown' })
            });
            this.log("📲 Notifikasi dikirim ke Telegram.");
        } catch (e) { this.log(`❌ Gagal kirim Telegram: ${e.message}`); }
    }

    async getOTP(email, maxRetries = 12) {
        const [user, domain] = email.split('@');
        this.log(`⏳ Menunggu OTP untuk ${email}...`);
        for (let i = 0; i < maxRetries; i++) {
            try {
                const res = await fetch(`https://generator.email/${domain}/${user}`);
                const html = await res.text();
                const $ = cheerio.load(html);
                const bodyText = $('body').text();
                const otpMatch = bodyText.match(/\b\d{6}\b/);
                if (otpMatch) return otpMatch[0];
            } catch (e) { }
            await new Promise(r => setTimeout(r, 10000));
        }
        return null;
    }

    async generateEmail() {
        try {
            const res = await fetch('https://generator.email/');
            const text = await res.text();
            const $ = cheerio.load(text);
            const domains = [];
            $('.e7m.tt-suggestions div > p').each((i, el) => domains.push($(el).text()));
            const domain = domains.length > 0 ? domains[Math.floor(Math.random() * domains.length)] : "gmail.com";
            return `${faker.internet.userName().toLowerCase()}${uuidv4().substring(0,4)}@${domain}`;
        } catch (e) { return faker.internet.email().toLowerCase(); }
    }

    async createAccount(index) {
        const email = await this.generateEmail();
        const password = this.config.password;
        this.log(`🚀 [${index}] Memproses pendaftaran: ${email}`);

        // Folder temp wajib di /tmp untuk lingkungan Cloud.
        const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `pw_` + uuidv4().substring(0, 8)));
        const browser = await firefox.launch({ headless: true });
        const context = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0" });
        const page = await context.newPage();

        try {
            // Alur Logika Pendaftaran Lengkap:
            await page.goto('https://chatgpt.com/auth/login', { waitUntil: 'networkidle', timeout: 60000 });
            await page.click('button:has-text("Sign up")');
            
            this.log("📧 Mengisi email...");
            await page.waitForSelector('input#email-address', { timeout: 15000 });
            await page.fill('input#email-address', email);
            await page.click('button[type="submit"]');

            this.log("🔑 Mengisi password...");
            await page.waitForSelector('input#password', { timeout: 15000 });
            await page.fill('input#password', password);
            await page.click('button:has-text("Continue")');

            // Proses OTP
            const otpCode = await this.getOTP(email);
            if (!otpCode) throw new Error("OTP tidak ditemukan.");
            
            this.log("🔢 Memasukkan OTP...");
            await page.waitForSelector('input[aria-label="Digit 1"]', { timeout: 15000 });
            await page.fill('input[aria-label="Digit 1"]', otpCode);

            // Profil Akun
            this.log("👤 Mengisi data diri...");
            await page.waitForSelector('input[name="firstname"]', { timeout: 20000 });
            await page.fill('input[name="firstname"]', faker.person.firstName());
            await page.fill('input[name="lastname"]', faker.person.lastName());
            await page.fill('input[name="birthday"]', "05/12/1992");
            await page.click('button:has-text("Agree")');

            await this.sendToTelegram(`✅ *Akun Berhasil!*\n📧 \`${email}\` \n🔑 \`${password}\` \n🌐 _Host: Leapcell_`);
        } catch (err) {
            this.log(`❌ Gagal: ${err.message}`);
        } finally {
            await browser.close();
            if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }

    async start() {
        for (let i = 1; i <= this.config.numAccounts; i++) {
            await this.createAccount(i);
            if (i < this.config.numAccounts) await new Promise(r => setTimeout(r, 15000));
        }
        this.log("🏁 Selesai. Server tetap aktif untuk menjaga koneksi.");
    }
}

const bot = new ChatGPTAccountCreator();
bot.start();

// Error Handling Global
process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
