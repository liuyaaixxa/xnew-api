任务： 完善 "完善设备令牌管理"能力，
要求：
1：点击添加设备令牌调用
创建用户接口：在调用 CreateUser 接口时的时候，用户名是输入当前系统登录的用户和设备名名词组合,格式：“{系统登录用户名}_{设备名称}”, 例如，admin_dev01;
2：创建用类型是：WORKLOAD


项目背景： 

相关材料： 

登录Octelium的方法     
octelium logout && \          
export OCTELIUM_DOMAIN=teniuapi.cloud && export OCTELIUM_INSECURE_TLS=true && \
octelium login --domain teniuapi.cloud --auth-token AQpABfm0_8f_2oRB2CU3-DuGzUW-8KMY_ObpOqoVA0DAkM0pFxoL8I9PGah8RxFoDubwXvPlUYjATCFVM-uVmFFxAxJACAMSEOeSH6OT10ZYlgI84BaexqsaEABsB0iPz0L2kMiNsBnsTTciENRjGXFl50M1v7L-owaFWQsqBgic4cLPBg

创建用户命令配置参考如下：
kind: User
metadata:
  name: k8s-1
spec:
  type: WORKLOAD
