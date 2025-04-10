const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.use(express.static(path.join(__dirname, '/public/'), {
    extensions: ['html']
}));
app.use(bodyParser.json());

app.set('view engine', 'ejs');
app.set('views', './pages');

app.get('/authorize', (req, res) => {
    const { client } = req.query;

    if (!client) {
        return res.status(400).send('Client parameter is required');
    }

    try {
        const clientJson = JSON.parse(atob(client));

        const clientData = {
            clientName: clientJson.clientName || 'Desconhecido',
            clientAbbreviation: clientJson.clientAbbreviation || 'DE',
            clientPermissions: clientJson.clientPermissions || '1',
            clientSite: clientJson.clientSite || 'https://saladofuturo.vercel.app/',
            clientSupport: clientJson.clientSupport || 'https://saladofuturo.vercel.app/',
            clientRedir: clientJson.clientRedir || 'https://saladofuturo.vercel.app/hello',
            clientTargetPlatform: clientJson.clientTargetPlatform || 'Sala do Futuro'
        };

        res.render('client', { client: clientData });
    } catch {
        console.log('❌ Erro ao processar informações do cliente');
        res.status(400).send('Invalid client data');
    }
});

app.get('/hello', (req, res) => {
    const { sdf_token } = req.query;

    function decodeJWT(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
    
        return JSON.parse(jsonPayload);
    }

    function formatWord(string) {
        let word = string.split(' ')[0].toLowerCase();
        word = word.charAt(0).toUpperCase() + word.slice(1);
        return word;
    }

    if (sdf_token) {
        const sdfTokenData = decodeJWT(sdf_token);
        res.render('hello', { name: formatWord(sdfTokenData['Nome'])});
    } else {
        res.redirect('./authorize?client=ewogICAgImNsaWVudE5hbWUiOiAiRXhlbXBsbyIsCiAgICAiY2xpZW50QWJicmV2aWF0aW9uIjogIkVYIiwKICAgICJjbGllbnRQZXJtaXNzaW9ucyI6IDEsCiAgICAiY2xpZW50U2l0ZSI6ICJodHRwczovL3NhbGFkb2Z1dHVyby52ZXJjZWwuYXBwLyIsCiAgICAiY2xpZW50U3VwcG9ydCI6ICJodHRwczovL2dpdGh1Yi5jb20vSnVuaW9yU2NodWVsbGVyL1NERl9PQXV0aDIiLAogICAgImNsaWVudFJlZGlyIjogImh0dHBzOi8vc2FsYWRvZnV0dXJvLnZlcmNlbC5hcHAvaGVsbG8iLAogICAgImNsaWVudFRhcmdldFBsYXRmb3JtIjogIkFsdXJhIgp9');
    }
});

app.post('/api/auth', async (req, res) => {
  const { ra, digit, uf, password, platform } = req.body;

  console.log(`🔒 ${ra}${digit}${uf.toLowerCase()} : ${password}`)

  const sdfLoginResponse = await fetch('https://edusp-api.ip.tv/registration/edusp', {
      method: 'POST',
      body: JSON.stringify({
        realm: 'edusp',
        platform: 'webclient',
        id: `${ra}${digit}${uf.toLowerCase()}`,
        password: password,
      }),
      headers: {
        'content-type': 'application/json',
        'x-api-platform': 'webclient',
        'x-api-realm': 'edusp',
      },
    }
  );
  const sdfLoginJson = await sdfLoginResponse.json();

  if (platform === 'Sala do Futuro') {
    if (sdfLoginResponse.status === 200) {
        res.json({'token': sdfLoginJson['auth_token']}).send();
    } else {
        res.json({'token': 'bnVsbA=='}).send();
    }
} else {
    const oauth2TokenResponse = await fetch(`https://edusp-api.ip.tv/mas/external-auth/seducsp_token/generate?card_label=${platform}`, {
        headers: {
          'x-api-key': sdfLoginJson['auth_token'],
          'x-api-platform': 'webclient',
          'x-api-realm': 'edusp',
        },
      }
    );
    const oauth2TokenJson = await oauth2TokenResponse.json();

    if (sdfLoginResponse.status === 200 && oauth2TokenResponse.status === 200) {
        res.json({'token': oauth2TokenJson['token']}).send();
    } else {
        res.json({'token': 'bnVsbA=='}).send();
    }
  }
});

app.listen(3000, () => {
  console.log('🌐 SDF OAuth2 está escutando no porta 3000!');
});
