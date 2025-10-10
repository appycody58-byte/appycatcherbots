import os, requests, logging, threading
from flask import Flask, request
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

BOT_TOKEN = os.getenv("BOT_TOKEN")
CRYPTO_PAY_TOKEN = os.getenv("CRYPTO_PAY_TOKEN")

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
tg_app = ApplicationBuilder().token(BOT_TOKEN).build()
pending_invoices = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("Welcome! Use /buy to get your instant digital reward ⚡")

async def buy(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.message.chat_id
    amount = "5"
    payload = {
        "asset": "USDT",
        "amount": amount,
        "description": "Instant reward",
        "paid_btn_name": "openBot",
        "paid_btn_url": "https://t.me/appycashflowbot"
    }
    headers = {"Crypto-Pay-API-Token": CRYPTO_PAY_TOKEN}
    r = requests.post("https://pay.crypt.bot/api/createInvoice", json=payload, headers=headers)
    data = r.json()
    invoice = data["result"]
    pending_invoices[invoice["invoice_id"]] = user_id
    await update.message.reply_text(f"Pay {amount} USDT here:\n{invoice['pay_url']}")

tg_app.add_handler(CommandHandler("start", start))
tg_app.add_handler(CommandHandler("buy", buy))

@app.route("/cryptopay-webhook", methods=["POST"])
def cryptopay_webhook():
    data = request.get_json()
    if data and data.get("update_type") == "invoice_paid":
        invoice_id = data["payload"]["invoice_id"]
        user_id = pending_invoices.get(invoice_id)
        if user_id:
            message = "✅ Payment received! Here’s your reward code: ABCD-1234"
            tg_app.bot.send_message(chat_id=user_id, text=message)
            pending_invoices.pop(invoice_id, None)
    return {"ok": True}

if __name__ == "__main__":
    threading.Thread(target=lambda: tg_app.run_polling()).start()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000))) 