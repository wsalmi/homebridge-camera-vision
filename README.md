# Homebridge Camera Vision

**Homebridge Camera Vision** é um plugin de plataforma para o Homebridge. Ele publica câmeras com fonte FFmpeg, em geral RTSP, no Apple HomeKit e mantém um painel local para acompanhar essas câmeras.

O app Casa continua responsável pelas gravações do HomeKit Secure Video (HKSV) no iCloud. O plugin entrega o stream, os fragments de vídeo e o evento de movimento que o HomeKit usa para iniciar a captura.

A base de execução é a biblioteca npm `camera.ui` 1.1.17: painel web, análise de vídeo e entrada de eventos por HTTP, MQTT, SMTP e FTP. Este repositório registra a plataforma `CameraVision`, adapta o ciclo de vida ao Homebridge 1.6 e 2, e acrescenta uma interface própria no Homebridge Config UI X. Blocos de configuração já gravados com o alias `CameraUI` continuam sendo lidos.

## Funcionalidades

- Plataforma `CameraVision`, marcada como única no `config.schema.json`.
- Stream, snapshot e substream via FFmpeg. A fonte precisa conter o argumento `-i`.
- `CameraController` do HAP-NodeJS, com `RecordingDelegate` para HKSV em MP4 fragmentado.
- Sensor de movimento, campainha opcional e interruptores de privacidade, exclusão e “At Home”.
- Prebuffer de 4 a 8 segundos antes do evento, quando `prebuffering` está ativo.
- Eventos de movimento e campainha vindos da análise de vídeo ou de HTTP, MQTT, SMTP e FTP, tratados pelo handler deste repositório.
- Painel web do `camera.ui`, com os arquivos de `interface/` rebatizados para Camera Vision. As telas compiladas incluem login, dashboard, câmeras, visualização, gravações, notificações, console, configurações, plugins e utilização.
- Interface do plugin no Homebridge: lista de câmeras, filtros, busca e preview ao vivo com JSMpeg. A lista enviada ao navegador traz nome, modelo, resolução e sinais de HKSV, movimento e áudio. A URL RTSP permanece no `config.json` e só é usada no processo FFmpeg do servidor. A tela de configuração abre o formulário nativo do schema do Homebridge.

Câmeras sem nome, sem `videoConfig.source`, com `source` sem `-i`, com `disable: true` ou com nome repetido não são publicadas. O comportamento final do HKSV também depende de um Home Hub e de um plano iCloud compatível com o recurso da Apple.

## Stack

- Node.js com módulos ESM
- Homebridge 1.6 ou 2 e HAP-NodeJS
- `camera.ui` 1.1.17
- FFmpeg, pelo binário de `ffmpeg-for-homebridge` ou pelo caminho em `options.videoProcessor`
- UI do plugin: Vue 2, Vue Router 3 e Vue CLI 4, com `@seydx/jsmpeg` no preview
- Testes do Node.js (`node --test`) e ESLint

## Requisitos

- Node.js `^22.12.0` ou `^24.0.0`, conforme `engines` em `package.json`.
- Homebridge `^1.6.0` ou `^2.0.0`. O código desliga o HKSV se a versão do Homebridge for anterior a 1.4.0.
- Uma fonte que o FFmpeg consiga abrir. O valor de `videoConfig.source` tem de incluir `-i`.
- FFmpeg. Sem `options.videoProcessor`, a configuração usa o binário exportado por `ffmpeg-for-homebridge`.

## Instalação

O nome do pacote é `homebridge-camera-vision`. No Homebridge ele é carregado como plugin de plataforma. A partir deste repositório:

```bash
git clone https://github.com/wsalmi/homebridge-camera-vision.git
cd homebridge-camera-vision
npm install
```

`npm install` foi executado neste ambiente. O `postinstall` chama `node scripts/sync-interface.js`, que copia `interface/` para a pasta de interface do `camera.ui` quando esse destino existe.

A UI do Homebridge Config UI X tem o próprio `package-lock.json`. Para compilá-la:

```bash
npm ci --prefix homebridge-ui/ui
npm run build
```

Os dois comandos foram executados com sucesso. O bundle sai em `homebridge-ui/public`. O script de build da UI define `NODE_OPTIONS=--openssl-legacy-provider` porque o Vue CLI 4 usa Webpack 4.

Depois da instalação, adicione a plataforma `CameraVision` ao `config.json` do Homebridge. Os dados de runtime do `camera.ui` ficam em `<diretório de storage do Homebridge>/camera.ui`.

## Comandos

| Comando | Função |
| --- | --- |
| `npm test` | Executa `node --test` sobre `test/`. |
| `npm run lint:plugin` | Roda o ESLint do plugin, ignorando `homebridge-ui`, `interface` e `node_modules`. |
| `npm run lint` | Roda o ESLint do plugin e o lint da UI. A parte da UI precisa das dependências de `homebridge-ui/ui`. |
| `npm run lint:homebridge-ui` | Atalho para o lint só da UI. |
| `npm run build` | Compila a UI do plugin para `homebridge-ui/public`. |
| `npm run watch` | Sobe o servidor de desenvolvimento da UI com `vue-cli-service serve`, na porta 8082. |

Não há script `start` nem workflow de CI. O hook `prepublishOnly` encadeia atualização do lockfile, `npm run lint`, `npm test` e `npm run build`.

Neste ambiente, `npm test` terminou com 4 testes aprovados e `npm run lint:plugin` terminou sem erros. `npm run lint` completo da UI não foi executado.

## Configuração

O bloco fica em `platforms` no `config.json` do Homebridge. O formulário está em [`config.schema.json`](./config.schema.json). Um exemplo mais longo está em [`example-config.json`](./example-config.json). Troque usuários, senhas e endereços pelos da sua rede antes de usar esse exemplo.

```json
{
  "platforms": [
    {
      "platform": "CameraVision",
      "name": "CameraVision",
      "port": 8081,
      "logLevel": "info",
      "cameras": [
        {
          "name": "Sala",
          "unbridge": true,
          "hsv": true,
          "motion": true,
          "prebuffering": true,
          "prebufferLength": 4,
          "videoConfig": {
            "source": "-i rtsp://usuario:senha@192.0.2.20:554/stream",
            "stillImageSource": "-i http://192.0.2.20/snapshot.jpg",
            "rtspTransport": "tcp",
            "maxWidth": 1280,
            "maxHeight": 720,
            "maxFPS": 20,
            "maxBitrate": 299,
            "vcodec": "copy",
            "audio": false
          },
          "videoanalysis": {
            "active": true
          }
        }
      ]
    }
  ]
}
```

### Campos principais

| Campo | Função |
| --- | --- |
| `platform` | Use `CameraVision`. Na leitura, `CameraUI` também é aceito. |
| `name` | Nome da plataforma. O padrão do schema é `CameraVision`. |
| `port` | Porta do painel web. O padrão da biblioteca é 8081. |
| `logLevel` | `info`, `debug`, `warn` ou `error`. |
| `atHomeSwitch` | Publica o acessório “At Home Switch”. |
| `options.videoProcessor` | Executável FFmpeg alternativo. |
| `ssl.active`, `ssl.key`, `ssl.cert` | HTTPS do painel. A biblioteca só ativa o SSL com os três valores presentes. |
| `cameras[].name` | Nome único. Ele identifica o acessório no HomeKit. |
| `cameras[].disable` | Não publica a câmera. |
| `cameras[].unbridge` | Publica a câmera como acessório externo. O schema marca isso como recomendado. |
| `cameras[].hsv` | Liga o HomeKit Secure Video. |
| `cameras[].motion`, `cameras[].doorbell`, `cameras[].switches` | Sensor, campainha e interruptores manuais de disparo. |
| `cameras[].privacySwitch`, `cameras[].excludeSwitch` | Interruptores de privacidade e de exclusão do modo “em casa”. |
| `cameras[].motionTimeout` | Segundos até o reset automático. O código aceita 0 a 170 e usa 15 fora desse intervalo. |
| `cameras[].motionDelay` | Espera de 0 a 10 segundos antes de tratar um evento externo. |
| `cameras[].prebuffering`, `cameras[].prebufferLength`, `cameras[].forcePrebuffering` | Prebuffer. O comprimento válido é 4 a 8 segundos; qualquer outro valor vira 4. |
| `cameras[].videoConfig.source` | Argumentos FFmpeg da fonte, incluindo `-i`. |
| `cameras[].videoConfig.subSource`, `cameras[].videoConfig.stillImageSource` | Substream e snapshot. Sem `-i` válido, o código reutiliza `source`. |
| `cameras[].hksvConfig.source`, `vcodec`, `acodec`, `audio` | Fonte e codecs usados só na gravação HKSV. |
| `cameras[].videoanalysis.active` | Análise de vídeo do `camera.ui` para detecção de movimento. |
| `mqtt`, `http`, `smtp`, `ftp` | Entradas de automação. Cada uma só sobe com `active: true`. |

`mqtt.username` e `mqtt.password` autenticam o cliente MQTT. Guarde esses valores só no `config.json` local.

### HomeKit Secure Video

Com `hsv: true`, a câmera registra um `CameraController` com delegate de gravação, contêiner MP4 fragmentado e o sensor de movimento como gatilho. `hksvConfig.source` aponta uma fonte exclusiva para essa gravação. `hksvConfig.vcodec` e `hksvConfig.acodec` escolhem cópia do fluxo ou transcodificação. Sem áudio compatível, a gravação pode seguir só com vídeo.

### HTTP, MQTT, SMTP e FTP

Quando a porta não vem no `config.json`, `camera.ui` aplica estes padrões:

| Serviço | Porta padrão | Uso |
| --- | --- | --- |
| Painel web | 8081 | Campo `port`. |
| HTTP | 7272 | `/motion?<nome>`, `/motion/reset?<nome>` e `/doorbell?<nome>`. |
| SMTP | 2727 | E-mail associado à câmera em `cameras[].smtp`. |
| FTP | 5050 | Envio de arquivo. `ftp.useFile` escolhe se o nome da câmera vem do arquivo ou do diretório. |
| MQTT | 1883 | Tópicos em `cameras[].mqtt`, com `mqtt.tls`, `mqtt.host`, `mqtt.username` e `mqtt.password`. |

O nome da câmera é a query string inteira. Espaços precisam de codificação de URL. Exemplo com a porta padrão e uma câmera chamada Sala:

```text
http://<host>:7272/motion?Sala
```

Com `http.localhttp: true`, esse servidor HTTP escuta apenas em localhost. O handler deste repositório recebe o evento já emitido pelo `camera.ui`, respeita `motionDelay` e `motionTimeout`, atualiza o sensor do HomeKit e, se o cliente MQTT da interface estiver conectado e a câmera tiver tópico de notificação, publica o estado nesse tópico.

## Variáveis de ambiente

A configuração do plugin fica no `config.json` do Homebridge. O código e os scripts consultam estes nomes:

| Nome | Uso |
| --- | --- |
| `NODE_ENV` | Com o valor `test`, o logger interno começa em `debug` até a plataforma aplicar `logLevel`. |
| `NODE_OPTIONS` | Os scripts `build` e `serve` de `homebridge-ui/ui` definem `--openssl-legacy-provider`. |

Os processos FFmpeg herdam o ambiente do processo do Homebridge.

## Estrutura

```text
index.js                      registra a plataforma CameraVision
src/platform.js               ciclo de vida, acessórios e gravação do config.json
src/accessories/              câmera, movimento, campainha e interruptores
src/services/                 processo FFmpeg, gravação HKSV e handler de eventos
services/config/              validação e limites da configuração
services/logger/              adaptação do logger do camera.ui
homebridge-ui/server.js       pedidos da UI do Homebridge: status, câmeras e preview
homebridge-ui/ui/             fonte Vue dessa UI
homebridge-ui/public/         bundle gerado por npm run build
interface/                    painel camera.ui compilado e rebatizado
scripts/sync-interface.js     copia interface/ no postinstall
scripts/rebrand-interface.py  reaplica o nome Camera Vision nos arquivos do painel
test/plugin-contract.test.js  registro da plataforma, config e CameraController
config.schema.json            formulário do Homebridge
example-config.json           exemplo de config.json
CHANGELOG.md                  histórico herdado do camera.ui
```

## Licença

Distribuído sob a licença MIT. O arquivo [`LICENSE`](./LICENSE) registra o copyright de 2020–2022 em nome de seydx.
