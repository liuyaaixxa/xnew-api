需求：部署  Teniu 云 website
1：website文件目录是：/Users/lya/workspace/aws/octem-ws/website
2： 官网域名是：https://teniuapi.cloud

要求：
1：请把这 /Users/lya/workspace/aws/octem-ws/website 不到 Octelium集群中； 可以需要权限的公开访问页面。
   参考处理：https://octelium.com/docs/octelium/latest/overview/management； 参考配置方法：kind: Service
metadata:
  name: first-service
spec:
  mode: WEB
  isPublic: true
  isAnonymous: true
  config:
    upstream:
      container:
        port: 80
        image: nginx:latest
2：现在官网teniuapi默认的是登录页面：https://teniuapi.cloud/login；
3：要求把website设置为默认页面；打开官网不需要跳转就是，是https://teniuapi.cloud的index页面。


其他：
服务器登录方法：ssh -i "usa-server.pem" ubuntu@teniuapi.cloud

登录服务器参考集群方式如下：
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true &&\
 octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg
