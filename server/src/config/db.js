import mongoose from "mongoose";
import https from "https";
import dns from "dns";
import { env } from "./env.js";

function safeMongoMessage(error) {
  const name = error?.name || "Error";
  const code = error?.code;
  return code ? `${name} (${code})` : name;
}

/**
 * Resolve SRV records using DNS-over-HTTPS (Cloudflare).
 * This bypasses ISP DNS blocking completely.
 */
function resolveSrvViaDoH(srvName) {
  return new Promise((resolve, reject) => {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(srvName)}&type=SRV`;
    https.get(url, { headers: { Accept: "application/dns-json" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (!json.Answer || json.Answer.length === 0) {
            return reject(new Error(`No SRV records found for ${srvName}`));
          }
          // SRV data format: "priority weight port target"
          const hosts = json.Answer.filter((a) => a.type === 33).map((a) => {
            const parts = a.data.split(" ");
            return {
              priority: +parts[0],
              weight: +parts[1],
              port: +parts[2],
              target: parts[3].replace(/\.$/, ""),
            };
          });
          resolve(hosts);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

/**
 * Resolve a hostname to IP addresses using DNS-over-HTTPS.
 */
function resolveHostViaDoH(hostname) {
  return new Promise((resolve, reject) => {
    const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
    https.get(url, { headers: { Accept: "application/dns-json" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          const ips = (json.Answer || []).filter((a) => a.type === 1).map((a) => a.data);
          resolve(ips);
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

/**
 * Build a direct mongodb:// connection string by resolving SRV records via DoH.
 */
async function buildDirectUri(srvUri) {
  const parsed = new URL(srvUri);
  const srvHostname = parsed.hostname;
  const srvName = `_mongodb._tcp.${srvHostname}`;

  console.log(`   Resolving SRV: ${srvName} via DNS-over-HTTPS...`);
  const hosts = await resolveSrvViaDoH(srvName);
  console.log(`   Found ${hosts.length} MongoDB hosts`);

  // Resolve each host to IP addresses (bypasses local DNS)
  const resolvedHosts = [];
  for (const host of hosts) {
    try {
      const ips = await resolveHostViaDoH(host.target);
      if (ips.length > 0) {
        resolvedHosts.push(`${ips[0]}:${host.port}`);
        console.log(`   ${host.target} → ${ips[0]}:${host.port}`);
      } else {
        // fallback to hostname
        resolvedHosts.push(`${host.target}:${host.port}`);
      }
    } catch {
      resolvedHosts.push(`${host.target}:${host.port}`);
    }
  }

  // Extract database name from path or search params
  const dbName =
    parsed.pathname && parsed.pathname !== "/"
      ? decodeURIComponent(parsed.pathname.slice(1).split("/")[0])
      : parsed.searchParams.get("appName") || undefined;

  // Build direct mongodb:// URI
  const auth = parsed.username ? `${parsed.username}:${parsed.password}@` : "";

  const directUri = `mongodb://${auth}${resolvedHosts.join(",")}/${dbName || "AmazonClone"}?ssl=true&authSource=admin&retryWrites=true&w=majority`;

  return { directUri, dbName };
}

/**
 * Extract the database name from a MongoDB URI path (e.g. /AmazonClone → "AmazonClone").
 */
function getDbNameFromUri(uri) {
  try {
    const parsed = new URL(uri);
    const pathDb =
      parsed.pathname && parsed.pathname !== "/"
        ? decodeURIComponent(parsed.pathname.slice(1).split("/")[0])
        : null;
    return pathDb || null;
  } catch {
    return null;
  }
}

let connectionPromise = null;

async function connectDB() {
  const uri = env.mongoUri;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set in your server/.env file. Please add your MongoDB connection string."
    );
  }

  // Check if connection is already active
  if (mongoose.connection.readyState === 1) {
    console.log("✅ [DB] Using cached MongoDB connection");
    return mongoose.connection;
  }

  if (connectionPromise) {
    console.log("⏳ [DB] MongoDB connection in progress, reusing promise");
    return connectionPromise;
  }

  connectionPromise = (async () => {
    // Extract DB name from URI path (e.g. /AmazonClone)
    const dbName = getDbNameFromUri(uri) || "AmazonClone";

    const connectOptions = {
      dbName,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
    };

    // --- Attempt 1: Try direct connection with SRV URI ---
    try {
      console.log("⏳ Connecting to MongoDB (SRV)...");
      // Set DNS to Google/Cloudflare in case system DNS is partially broken
      try {
        const servers = String(env.mongoDnsServers || "").split(",").map((server) => server.trim()).filter(Boolean);
        if (servers.length) dns.setServers(servers);
      } catch (dnsErr) {
        // ignore if custom dns set error
      }

      await mongoose.connect(uri, connectOptions);
      console.log("✅ MongoDB connected successfully (SRV)");
      console.log(`   Database: ${mongoose.connection.db.databaseName}`);
      connectionPromise = null;
      return mongoose.connection;
    } catch (srvError) {
      console.log(`⚠️  SRV connection failed: ${safeMongoMessage(srvError)}`);
      await mongoose.disconnect().catch(() => {});
    }

    // --- Attempt 2: Bypass DNS entirely using DNS-over-HTTPS ---
    if (uri.startsWith("mongodb+srv://")) {
      try {
        console.log("⏳ Bypassing DNS — resolving via DNS-over-HTTPS...");
        const { directUri } = await buildDirectUri(uri);

        await mongoose.connect(directUri, {
          ...connectOptions,
          tls: true,
        });
        console.log("✅ MongoDB connected successfully (direct IP)");
        console.log(`   Database: ${mongoose.connection.db.databaseName}`);
        connectionPromise = null;
        return mongoose.connection;
      } catch (directError) {
        console.error(`❌ Direct connection also failed: ${safeMongoMessage(directError)}`);
        await mongoose.disconnect().catch(() => {});
        connectionPromise = null;
        throw directError;
      }
    }

    connectionPromise = null;
    throw new Error("Unable to connect to MongoDB");
  })();

  return connectionPromise;
}

/**
 * Checks if database connection is currently active
 * @returns {boolean} Connection status
 */
const isDbConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Waits for database connection to be established
 * @param {number} timeoutMs - Maximum time to wait (default: 30s)
 * @returns {Promise<boolean>} Whether connection was established
 */
const waitForConnection = async (timeoutMs = 30000) => {
  if (isDbConnected()) return true;

  if (connectionPromise) {
    try {
      await Promise.race([
        connectionPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs)),
      ]);
      return isDbConnected();
    } catch (e) {
      return isDbConnected();
    }
  }

  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (isDbConnected()) return true;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return false;
};

// Aliases for compatibility across existing app files
const connectDatabase = async () => {
  try {
    await connectDB();
    return true;
  } catch (err) {
    console.warn(`MongoDB unavailable; API will use demo fallback data (${safeMongoMessage(err)})`);
    return false;
  }
};

const databaseReady = isDbConnected;

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
};

export { connectDB, connectDatabase, isDbConnected, databaseReady, waitForConnection, disconnectDatabase };
export default connectDB;
