/* Script To Get A List Of Shared Tokens Between OneInch and 0x
 * Returns A JSON File
 */
import fetch from 'node-fetch'
import fs from 'fs'

import { ASSET_ADDRESSES } from './utils'

const getZeroExTokenPairs = async (tokenSymbol) => {
  const tokenAddress = ASSET_ADDRESSES[tokenSymbol].substring(2, 42)
  const queryUrl = `
  https://api.0x.org/sra/v3/asset_pairs?\
assetDataA=0xf47261b0000000000000000000000000${tokenAddress}&\
perPage=1000
`
  const zrxResponse = await fetch(queryUrl)
  const zrxData = await zrxResponse.json()

  return zrxData.records
}

const getOneInchSupportedToken = async () => {
  const response = await fetch('https://api.1inch.exchange/v2.0/tokens')
  const data = await response.json()

  return Object.keys(data.tokens)
}

const getUniqueTokens = (zeroExPairs) => {
  const zeroExTokens = []

  for (let i = 0; i < zeroExPairs.length; i++) {
    const pair = zeroExPairs[i]

    const assetDataA = pair.assetDataA.assetData
    const assetDataB = pair.assetDataB.assetData

    /* Exclude non-ERC20 tokens */
    if (
      !assetDataA.includes('0xf47261b0000000000000000000000000') ||
      !assetDataB.includes('0xf47261b0000000000000000000000000')
    ) continue

    /* Remove address prefix */
    const assetAddressA = assetDataA.replace(/0xf47261b0000000000000000000000000/g, '0x')
    const assetAddressB = pair.assetDataB.assetData.replace(/0xf47261b0000000000000000000000000/g, '0x')

    /* Filter duplicates */
    if (assetAddressA !== ASSET_ADDRESSES.WETH && !zeroExTokens.includes(assetAddressA)) zeroExTokens.push(assetAddressA)
    else if (assetAddressB !== ASSET_ADDRESSES.WETH && !zeroExTokens.includes(assetAddressB)) zeroExTokens.push(assetAddressB)
    else continue
  }

  return zeroExTokens
}

const getTokenDetails = async (commonTokens) => {
  const tokenDetails = {}

  const response = await fetch('https://api.1inch.exchange/v2.0/tokens')
  const data = await response.json()
  const oneInchTokens = data.tokens

  for (let key in oneInchTokens) {
    if (oneInchTokens.hasOwnProperty(key) && commonTokens.includes(key))
      tokenDetails[key] = oneInchTokens[key]
  }

  return tokenDetails
}

const writeToFile = async (path, content) => {
  if (!fs.existsSync(path)) fs.mkdirSync(path)
  fs.writeFile(`${path}/sharedTokens.json`, content, error => {
    if (error) throw error;
    console.log("JSON data is saved.")
  })
}

(async () => {
  const oneInchTokens = await getOneInchSupportedToken()
  const zeroExPairs = await getZeroExTokenPairs('WETH')

  const zeroExTokens = getUniqueTokens(zeroExPairs)
  const commonTokens = zeroExTokens.filter(token => oneInchTokens.includes(token))

  const tokensWiki = await getTokenDetails(commonTokens)
  writeToFile('./tmp', JSON.stringify(tokensWiki))
})()
