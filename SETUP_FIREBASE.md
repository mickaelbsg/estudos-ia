# Configuração do Firebase

O portal continua hospedado no GitHub Pages. O Firebase será usado somente para autenticação Google e armazenamento do CRUD.

## 1. Criar o projeto

1. Acesse o Firebase Console e crie um projeto.
2. No projeto, adicione um aplicativo Web.
3. Copie o objeto `firebaseConfig` exibido pelo Firebase.
4. Cole os valores em `firebase-config.js`.

## 2. Ativar o login Google

1. Abra **Authentication > Sign-in method**.
2. Ative o provedor **Google**.
3. Em **Authentication > Settings > Authorized domains**, adicione:
   - `mickaelbsg.github.io`
   - o domínio personalizado, caso exista.

## 3. Criar o Firestore

1. Abra **Firestore Database**.
2. Crie o banco em modo de produção.
3. Escolha a região desejada.

## 4. Registrar o administrador

1. Faça login no portal usando o botão **Entrar com Google**.
2. Abra **Authentication > Users** no Firebase Console.
3. Copie o UID da sua conta.
4. Em `firebase-config.js`, adicione o UID:

```js
adminUids: ["SEU_UID"]
```

5. Em `firestore.rules`, substitua `COLE_SEU_UID_AQUI` pelo mesmo UID.
6. Publique as regras no Firebase Console ou com o Firebase CLI:

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Migrar os vídeos atuais

Depois de confirmar que o login administrativo está ativo:

1. Abra a aba **Vídeos**.
2. Clique em **Migrar dados atuais**.
3. Confirme a operação.

O portal copiará os canais e vídeos existentes para o Firestore e passará a usar o banco como fonte principal.

## Segurança

- O objeto `firebaseConfig` pode permanecer no repositório público.
- Nunca publique JSON de Service Account, chaves privadas ou credenciais do Firebase Admin SDK.
- Ocultar botões no navegador não é uma medida de segurança. As regras do Firestore são obrigatórias.
- As regras incluídas neste repositório bloqueiam toda gravação enquanto o UID não for substituído.
