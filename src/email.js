import 'dotenv/config'
import nodemailer from 'nodemailer'
import mailgun from 'nodemailer-mailgun-transport'

import { now, displayTokens } from './utils'

/* Set Up Email Configuration */
const mailConfiguration = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN
  }
}
const nodemailerMailgun = nodemailer.createTransport(mailgun(mailConfiguration))

export const sendNotificationEmail = ({
  arbitrageOrder,
  exchangeOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  nodemailerMailgun.sendMail({
    from: 'Arbitrage Bot 🤖 <arbitrage@heroku.org>',
    to: process.env.SEND_TO,
    subject: 'Arbitrage found! 🤑',
    html: `
      <h2>Arbitrage Report</h2>
      <p><b>Arbitrage Order:</b> ${arbitrageOrder.join(', ')}</p>
      <p><b>Exchange Order:</b> ${exchangeOrder.join(', ')}</p>
      <p><b>Input:</b> ${displayTokens(inputAssetAmount, arbitrageOrder[0], web3)}</p>
      <p><b>Output:</b> ${displayTokens(outputAssetAmount, arbitrageOrder[0], web3)}</p>
      <p><b>Profit:</b> ${displayTokens(netProfit.toString(), arbitrageOrder[0], web3)}</p>
      <p><b>Timestamp:</b> ${now()}</p>
    `,
  }, error => {
    if (error) console.log(`Error: ${error}`)
    else console.log('Email notification sent!')
  })
}
