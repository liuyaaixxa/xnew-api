
任务：集成 octelium客户端，打通octelium网络服务,生成可以服务octelium的auth-token，用于设备打通octelium云端。
要求：
1:在"令牌管理"页面，新增一个卡片区域，"设备令牌管理"区域。
2:"设备令牌管理"与"令牌管理" 布局基本一致。
3："添加令牌"按钮：调用，集成 octelium-go客户端，生成auth-token; 保存在xnewapi数据库(token和用户关联)，在页面显示。
3："删掉令牌"按钮：调用，集成 octelium-go客户端，从数据库删掉，业务不显示.

材料：
octelium客户端测试：
测试&开发账号：
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true &&\
 octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg



AQpAWZUBRkp9n_6SOk0i_CpuIfiGSts32hV7M-mPvS1PNznbZW6pYei6tquHEVTHUSsBDNR-nLrK1Ss9UXCoQ7RfDBI4CAMSEOeSH6OT10ZYlgI84BaexqsaEPvHi7aVtkAUl14W1EPPbc4iEL75-04_JEfouVlmhC8HhoQ
 
octelium客户："github.com/octelium/octelium/octelium-go"
文档：https://octelium.com/docs/octelium/latest/management/guide/octelium-go
octelium:https://github.com/octelium/octelium

需求背景：共享服务家庭大模型Token/GPU服务平台。
1：家庭节点把自己的闲置是GPU电脑或者大模型Token，通过本地智能网关节点teniulink-node-client,把本地的智能服务共享到teniu云端
   服务方式1：闲置电脑有GPU服务，可以使用ollama部署本地模型，启动 http://localhost:11434模型服务
   服务方式2：闲置LLM厂家Token，在teniulink-node配置模型服务，连接到大模型厂家。
   teniulink-node集成octelium软件，启动本地网关http://localhost:23333 本地大模型给共享服务，通过octelium组件的服务网络，导出云端，
   服务的调用出口是xnew-api云端统一大模型网关。
   普通用户通过xnew-api网关调用家庭节点共享的网络服务。
   主要的流程是
   1：普通用户A调用大模型服务流程：普通用户A-->云端xnew-api统一llm网关->octelium云端隧道->家庭节智能网关B-->（ollma服务或者大模型厂家服务）
   2：家庭用户B：发布服务流程：家庭用户B-->启动本地服务（ollma服务或者大模型厂家服务）--> 打开Teniu node 智能网关-->octelium联通云端Octelium隧道-发布服务在xnew-api模型广场。
   3：支付流程：普通用户A订阅服务，支付充值，根据调用Token的流量计费日志计算，从钱包扣钱或者包月及时模型；把Token消费积分日志同步区块solana； 根据调用的积分日志，给家庭用户B转按天技术服务费用，服务钱包openfort提供。
   4:用户注册流程：通过lap平台authentik认证用户身份，从openfort申请钱包，在solana公链完成交易。

   云端xnew-api：提供统一打模型网络完成，大模型计费服务
   octelium云端隧道: 服务服务调度和路由
   家庭节智能网关B：打通云端隧道，把本地服务通过octelium隧道暴露到云端，本地服务路由
   solana：项目早期积分上链模式，根据积分按天给家庭用户结算。

-----
主要的技术框架如下：
1：云端LLMAPI出口，https://github.com/liuyaaixxa/xnew-api
2: 家庭节点,本地智能网关,https://github.com/liuyaaixxa/teniulink-node-client
3: lap：身份认证框架：https://github.com/goauthentik/authentik
4: 云端，家庭智能网关的云端通道：https://github.com/octelium/octelium
5: 区块链钱包：https://github.com/openfort-xyz/opensigner
6：区块链开发框架:https://github.com/solana-foundation/anchor
7: 区块链:https://github.com/solana-labs/solana
