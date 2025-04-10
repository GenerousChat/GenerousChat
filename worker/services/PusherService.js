const crypto = require("crypto");
const https = require("https");
const config = require("../config");

class PusherService {
  constructor() {
    this.config = config.pusher;
  }

  md5(str) {
    return crypto.createHash("md5").update(str).digest("hex");
  }

  generateSignature(stringToSign) {
    return crypto
      .createHmac("sha256", this.config.secret)
      .update(stringToSign)
      .digest("hex");
  }

  async sendEvent(channel, eventName, data) {
    return new Promise((resolve, reject) => {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const eventData = JSON.stringify(data);
        const body = JSON.stringify({
          name: eventName,
          channel: channel,
          data: eventData,
        });

        const bodyMd5 = this.md5(body);
        const stringToSign = `POST\n/apps/${this.config.appId}/events\nauth_key=${this.config.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`;
        const signature = this.generateSignature(stringToSign);

        const options = {
          hostname: `api-${this.config.cluster}.pusher.com`,
          port: 443,
          path: `/apps/${this.config.appId}/events`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        };

        options.path += `?auth_key=${this.config.key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`;

        const req = https.request(options, (res) => {
          let responseData = "";
          res.on("data", (chunk) => responseData += chunk);
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              reject(new Error(`Failed to send event: ${res.statusCode} - ${responseData}`));
            }
          });
        });

        req.on("error", reject);
        req.write(body);
        req.end();

      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PusherService();