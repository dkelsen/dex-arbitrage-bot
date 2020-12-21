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
  assetOrder,
  inputAssetAmount,
  outputAssetAmount,
  netProfit,
  web3
}) => {
  nodemailerMailgun.sendMail({
    from: 'Arbitrage Bot 🤖 <arbitrage@heroku.org>',
    to: 'dilshan.kelsen@gmail.com',
    subject: 'Arbitrage found! 🤑',
    html: `
      <h2>Arbitrage Report</h2>
      <p><b>Asset Order:</b> ${assetOrder.join(', ')}</p>
      <p><b>Exchange Order:</b> ZRX, 1Split</p>
      <p><b>Input:</b> ${displayTokens(inputAssetAmount, assetOrder[0], web3)}</p>
      <p><b>Output:</b> ${displayTokens(outputAssetAmount, assetOrder[0], web3)}</p>
      <p><b>Profit:</b> ${displayTokens(netProfit.toString(), assetOrder[0], web3)}</p>
      <p><b>Timestamp:</b> ${now()}</p>
    `,
  }, error => {
    if (error) console.log(`Error: ${error}`)
    else console.log('Email notification sent!')
  })
}
