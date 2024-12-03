import { PrismaClient } from "@prisma/client";
import baileysWhatApp from "@whiskeysockets/baileys";
import cryptoConfig from "../../configs/crypto.config.js";

const prisma = new PrismaClient();
const fixId = (id) => id.replace(/\//g, "__").replace(/:/g, "-");

const { BufferJSON, initAuthCreds, proto } = baileysWhatApp;

const usePostgresqlAuthState = async (id_device) => {
  const writeData = async (data, filename) => {
    try {
      data = JSON.stringify(data, BufferJSON.replacer);
      filename = fixId(filename);
      data = cryptoConfig.encrypt(data, id_device);

      await prisma.sessions.upsert({
        select: { id_session: true },
        where: {
          id_device_filename: {
            id_device,
            filename,
          },
        },
        update: { data },
        create: {
          id_device,
          filename,
          data,
        },
      });
    } catch (error) {
      console.error(error, "An error occurred during session write");
    }
  };

  const readData = async (filename) => {
    try {
      const result = await prisma.sessions.findUnique({
        select: { data: true },
        where: {
          id_device_filename: {
            id_device,
            filename: fixId(filename),
          },
        },
      });

      if (!result) {
        console.log({ id_device, filename }, "Trying to read non-existent session data1");
        return null;
      }

      const data = cryptoConfig.decrypt(result.data, id_device);
      return JSON.parse(data, BufferJSON.reviver);
    } catch (error) {
      if (error.code === "P2025") {
        console.log({ id_device, filename }, "Trying to read non-existent session data2");
      } else {
        console.log(error, "An error occurred during session read");
      }
      return null;
    }
  };

  const removeData = async (filename) => {
    try {
      await prisma.sessions.delete({
        select: { id_session: true },
        where: {
          id_device_filename: {
            id_device,
            filename: fixId(filename),
          },
        },
      });
    } catch (error) {
      console.error(error, "An error occurred during session delete");
    }
  };

  const creds = (await readData("creds")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];

          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const sId = `${category}-${id}`;
              tasks.push(value ? writeData(value, sId) : removeData(sId));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: () => writeData(creds, "creds"),
  };
};

export default usePostgresqlAuthState;
