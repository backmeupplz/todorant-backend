import * as jwt from 'jsonwebtoken'
import * as jwksClient from 'jwks-rsa'

const secret = process.env.JWT

export function sign(payload: object) {
  return new Promise((res, rej) => {
    jwt.sign(payload, secret, undefined, (err, token) => {
      return err ? rej(err) : res(token)
    })
  })
}

export function verify(token: string) {
  return new Promise((res, rej) => {
    jwt.verify(token, process.env.JWT, undefined, (err, payload) => {
      return err ? rej(err) : res(payload)
    })
  })
}

const APPLE_BASE_URL = 'https://appleid.apple.com'

export const getApplePublicKey = async (kid) => {
  const client = jwksClient({
    cache: true,
    jwksUri: `${APPLE_BASE_URL}/auth/keys`,
  })
  const key: any = await new Promise((resolve, reject) => {
    client.getSigningKey(kid, (error, result) => {
      if (error) {
        return reject(error)
      }
      return resolve(result)
    })
  })
  return (
    (key.publicKey as jwksClient.CertSigningKey) ||
    (key.rsaPublicKey as jwksClient.RsaSigningKey)
  )
}

export async function verifyAppleToken(idToken: string, clientId?: string) {
  const decoded = jwt.decode(idToken, { complete: true })
  const { kid, alg } = (decoded as any).header
  const applePublicKey = await getApplePublicKey(kid)
  const jwtClaims = jwt.verify(idToken, applePublicKey as any, {
    algorithms: [alg],
  }) as any
  if (clientId && jwtClaims.aud !== clientId) {
    throw new Error(
      `The aud parameter does not include this client - is: ${jwtClaims.aud} | expected: ${clientId}`
    )
  }
  return jwtClaims
}
