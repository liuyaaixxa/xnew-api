任务： 实现生成联通teniu cloud 的设备auth-token
用户流程：
登录系统--进入个人中心->设备令牌管理->点击添加设备令牌按钮
添加设备令牌实现方法：
0：测试Octelium-go-sdk； 连接Octelium云。
   octeliumg-o-sdk："github.com/octelium/octelium/octelium-go"
   配置用管理员登录的auto-token：你用如下的auth-token配置为环境变量，测试功能。
  方法如下：
 octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg
 

登录服务器参考集群方式如下：
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true &&\
octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg



文档：https://octelium.com/docs/octelium/latest/management/guide/octelium-go
octelium:https://github.com/octelium/octelium

1：读取用户A的登录名称名，判断的用户A是否在Octelium云是否存在。 不存在用octelium 云端创建用户A。
2：调用octemlium生成令牌的方法，生成令牌返回页面。

AQpA****HhoQ

登录服务器参考集群方式如下：
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true &&\
octelium login --domain teniuapi.cloud --auth-token AQpAWZUBRkp9n_6SOk0i_CpuIfiGSts32hV7M-mPvS1PNznbZW6pYei6tquHEVTHUSsBDNR-nLrK1Ss9UXCoQ7RfDBI4CAMSEOeSH6OT10ZYlgI84BaexqsaEPvHi7aVtkAUl14W1EPPbc4iEL75-04_JEfouVlmhC8HhoQ

