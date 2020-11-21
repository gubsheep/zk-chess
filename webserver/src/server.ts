import express, {Request, Response} from 'express';
import path from 'path';
import http from 'http';
import cors from 'cors';
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: 'https://darkforest-7f0ab.firebaseio.com',
});

type tableData = {
  tableId: string;
  gameId?: string;
};

const db = admin.firestore();

const PORT = 3000;

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const main = async () => {
  app.use(express.static('../client/dist'));

  app.get('/battleship/api/:tableId', async (req: Request, res: Response) => {
    const data = (
      await db.collection('battleship').doc(req.params.tableId).get()
    ).data() as tableData;
    res.send({gameId: data?.gameId || null});
  });

  app.post(
    '/battleship/api/setGameId/:tableId',
    async (req: Request, res: Response) => {
      try {
        const gameId = req.body.gameId;
        await db.collection('battleship').doc(req.params.tableId).set({
          tabldId: req.params.tableId,
          gameId,
        });
        res.send({success: true});
      } catch (e) {
        res.send({success: false});
      }
    }
  );

  app.get('/battleship/*', (_: Request, res: Response) => {
    res.sendFile(path.resolve('../client/dist/index.html'));
  });

  httpServer.listen(PORT, () => {
    console.log(`Listening on ${PORT}.`);
  });
};

main();
