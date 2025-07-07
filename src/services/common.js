import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';
import axios from 'axios';
// const bcryptSaltRounds = 10;
export const bcryptHash = async (value) => {
    return bcrypt.hash(value, bcryptSaltRounds);
};
// const run = async () => {
//   const hashedPassword = await bcryptHash("Malgo@321");
//   console.log("Hashed Password:", hashedPassword);
// };
// run();
export const bcryptCompare = async (value, hash) => {
    return bcrypt.compare(value, hash);
};

export const getIPAddress = (request) => {
    let ip = request.headers['x-forwarded-for'] ||
        request.connection.remoteAddress ||
        request.socket.remoteAddress ||
        request.connection.socket.remoteAddress;
    ip = ip.split(',')[0];
    ip = ip.split(':').slice(-1);
    return ip[0];
};

export const getLocation = async (ip) => {
    try {
        const response = await axios.get(`http://ip-api.com/json/${ip}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching location data:", error.message);
        throw error;
    }
};

export const getPublicIP = async () => {
    try {
        const response = await axios.get("https://api64.ipify.org?format=json");
        return response.data.ip;
    } catch (error) {
        console.error("Error getting public IP:", error.message);
        return null;
    }
};