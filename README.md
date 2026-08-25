# Homebridge Camera Vision

**Homebridge Camera Vision** é um plugin de plataforma para expor câmeras RTSP ao Apple HomeKit. Ele usa o fork `wsalmi/homebridge-camera-ui` como ponto de partida, mas reorganiza a identidade do pacote, moderniza a interface embarcada e prepara o ciclo de vida das câmeras para o Homebridge v2.

A solução combina streaming H.264 via FFmpeg, snapshots, sensores de movimento, campainha opcional, prebuffering e **HomeKit Secure Video (HKSV)**. Quando o HKSV está habilitado, o Home app continua sendo responsável por armazenar as gravações no iCloud; o plugin fornece ao HomeKit os fragments de vídeo e os eventos necessários para a gravação orientada por movimento.

## Estado do projeto

| Área | Estado |
| --- | --- |
| Registro como plataforma `CameraVision` | Implementado |
| Compatibilidade declarada com Homebridge v1.6 e v2 | Implementado |
| `CameraController` e `RecordingDelegate` para HKSV | Mantidos e ajustados |
| Detecção por vídeo, HTTP, MQTT, SMTP e FTP | Preservada do fork |
| Nova UI embarcada | Implementada em Vue com CSS próprio |
| Dashboard live com JSMpeg | Implementado |
| Sanitização de credenciais RTSP na UI | Implementada |
| Testes com câmera física e gravação real no iCloud | Requer ambiente HomeKit do usuário |

> O plugin precisa de uma fonte RTSP válida e de um binário FFmpeg acessível. O comportamento final do HKSV também depende de um Home Hub e de um plano iCloud compatível com o recurso da Apple.

## Instalação

Durante o desenvolvimento local, clone o projeto e instale suas dependências:

```bash
git clone https://github.com/wsalmi/homebridge-camera-vision.git
cd homebridge-camera-vision
npm install
npm run build
```

Para uma instalação global depois que o pacote for publicado:

```bash
sudo npm install -g homebridge-camera-vision@latest
```

No Homebridge Config UI, adicione a plataforma **Camera Vision** e abra a UI do plugin pela entrada customizada. A interface nova não exibe as URLs RTSP no navegador; as credenciais permanecem no `config.json` e são usadas somente no backend.

## Configuração mínima

A configuração usa o schema do Homebridge. O campo `source` deve conter a opção `-i` do FFmpeg:

```json
{
  "platforms": [
    {
      "platform": "CameraVision",
      "name": "CameraVision",
      "port": 8081,
      "cameras": [
        {
          "name": "Sala",
          "unbridge": true,
          "hsv": true,
          "motion": true,
          "prebuffering": true,
          "prebufferLength": 4,
          "videoConfig": {
            "source": "-i rtsp://usuario:senha@192.168.1.20:554/stream",
            "stillImageSource": "-i http://192.168.1.20/snapshot.jpg",
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

O arquivo [`example-config.json`](./example-config.json) contém um exemplo mais extenso com sensores auxiliares, MQTT, fontes de gravação HKSV e configurações avançadas de FFmpeg. Para reduzir o risco de exposição acidental, use credenciais de teste no exemplo e substitua-as localmente.

## HomeKit Secure Video

O HKSV é habilitado por câmera com `hsv: true`. O plugin registra o `CameraController` com uma configuração de gravação fragmentada em MP4 e associa o sensor de movimento ao evento que o HomeKit utiliza para iniciar a captura. A câmera HKSV é anunciada com uma sessão de vídeo dedicada, enquanto a UI do plugin pode continuar exibindo o preview live.

A gravação pode usar a fonte principal ou uma fonte específica em `hksvConfig.source`. Se a câmera não fornecer áudio compatível, o fluxo pode operar sem áudio ou usar a transcodificação definida no schema. Para reduzir latência, `prebuffering` conserva alguns segundos antes do evento, quando a câmera e o processamento local suportam esse modo.

| Opção | Função |
| --- | --- |
| `hsv` | Habilita os serviços de gravação do HomeKit |
| `hksvConfig.source` | Define uma fonte exclusiva para gravação |
| `hksvConfig.vcodec` | Define cópia ou transcodificação H.264 |
| `hksvConfig.acodec` | Define cópia ou transcodificação AAC |
| `prebuffering` | Tenta incluir alguns segundos anteriores ao movimento |
| `prebufferLength` | Define o tamanho do prebuffer, entre 4 e 8 segundos |

O suporte de API segue o modelo atual do HAP-NodeJS: o `CameraController` recebe `recording.delegate`, `recording.options` e sensores opcionais, em vez de usar a API legada `cameraSource` [1] [2].

## Detecção de movimento

A detecção local pode comparar frames de uma substream por análise de vídeo. Também é possível receber um evento externo por HTTP, MQTT, SMTP ou FTP. O `Handler` centraliza a transição do sensor, aplica o atraso e o timeout configurados e aciona o evento HKSV quando o recurso está habilitado.

O endpoint HTTP, quando ativado, segue o formato abaixo:

```text
http://localhost:8123/motion?Sala
```

Para MQTT, configure um tópico específico por câmera e uma mensagem de ativação e, opcionalmente, outra de reset. Em instalações com sensores externos, `motionDelay` pode compensar a diferença entre a detecção do sensor e a chegada do vídeo.

## Nova interface

A UI embarcada foi reconstruída com uma identidade própria de **Camera Vision**. Ela oferece navegação lateral, indicador de conexão com o Homebridge, filtro por câmeras online ou com HKSV, busca, cards responsivos e preview live. O transporte binário de preview por eventos do Homebridge foi preservado para evitar uma migração desnecessária do pipeline FFmpeg/JSMpeg.

A tela de configuração usa o formulário nativo do Homebridge. Assim, a experiência visual pode evoluir sem duplicar a validação do schema nem criar uma segunda fonte de verdade para o `config.json`.

## Compatibilidade Homebridge v2

O pacote declara os seguintes engines:

```json
{
  "node": "^22.12.0 || ^24.0.0",
  "homebridge": "^1.6.0 || ^2.0.0"
}
```

A migração remove o quarto argumento do registro de plataforma, usa `getServiceById()` para serviços auxiliares, mantém `versionGreaterOrEqual()` somente para compatibilidade condicional do Homebridge e usa `CameraController` para streaming e gravação. A plataforma aceita a leitura de configurações com o alias histórico `CameraUI` no backend da UI, mas novas instalações devem usar `CameraVision`.

O Homebridge v2 altera componentes internos do HAP-NodeJS e recomenda declarar compatibilidade somente depois de testar o plugin com a versão v2 [1]. O build automatizado deste repositório usa o Homebridge 2 como dependência de desenvolvimento.

## Desenvolvimento e validação

Os comandos principais são:

```bash
npm run lint
npm test
NODE_OPTIONS=--openssl-legacy-provider npm run build
```

O `NODE_OPTIONS` ainda é necessário porque o frontend mantém o pipeline Vue CLI/Webpack 4 para permanecer compatível com o ambiente de UI do Homebridge. O bundle final é escrito em `homebridge-ui/public` e empacotado com o plugin.

## Referências

[1]: https://github.com/homebridge/homebridge/wiki/Updating-To-Homebridge-v2.0 "Homebridge — Updating To Homebridge v2.0"

[2]: https://developers.homebridge.io/HAP-NodeJS/interfaces/CameraControllerOptions.html "HAP-NodeJS — CameraControllerOptions"

[3]: https://github.com/wsalmi/homebridge-camera-ui "Fork utilizado como inspiração"

## Licença

Este projeto é distribuído sob a licença MIT. Consulte [`LICENSE`](./LICENSE) para o texto completo.
