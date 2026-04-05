import React from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../components/layout/LegalPageLayout';

const LandingPrivacy = () => {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      title={t('隐私政策')}
      subtitle={t('最后更新日期：2025 年 1 月 1 日')}
    >
      <div className='lp-legal-section'>
        <p>
          {t('Teniu Cloud（以下简称"我们"）非常重视您的隐私。本隐私政策详细说明了我们如何收集、使用、保护和处理您的个人信息。使用我们的服务即表示您同意本隐私政策中描述的数据处理方式。')}
        </p>
      </div>

      <hr className='lp-legal-divider' />

      <div className='lp-legal-section'>
        <h2>{t('信息收集')}</h2>
        <h3>{t('我们收集的信息')}</h3>
        <ul>
          <li>{t('账户信息：注册时提供的用户名、电子邮箱地址')}</li>
          <li>{t('设备信息：设备类型、操作系统版本、浏览器类型')}</li>
          <li>{t('使用数据：服务使用频率、API 调用记录、访问日志')}</li>
          <li>{t('网络信息：IP 地址、连接时间、节点状态信息')}</li>
          <li>{t('支付信息：充值记录、消费记录（我们不直接存储银行卡信息）')}</li>
        </ul>
        <h3>{t('自动收集的信息')}</h3>
        <p>
          {t('当您访问或使用我们的服务时，我们会自动收集某些信息，包括但不限于：服务器日志数据、设备标识符、Cookie 数据以及类似技术所收集的信息。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('信息使用')}</h2>
        <p>{t('我们将收集的信息用于以下目的：')}</p>
        <ul>
          <li>{t('提供、维护和改进我们的服务')}</li>
          <li>{t('处理您的交易和管理账户')}</li>
          <li>{t('发送服务通知和技术更新')}</li>
          <li>{t('检测和预防欺诈、滥用行为及安全威胁')}</li>
          <li>{t('分析服务使用情况以优化用户体验')}</li>
          <li>{t('遵守法律法规要求')}</li>
        </ul>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('Cookie 政策')}</h2>
        <p>
          {t('我们使用 Cookie 和类似的跟踪技术来增强您的使用体验。Cookie 帮助我们记住您的偏好设置、保持登录状态并分析网站流量。您可以通过浏览器设置管理 Cookie 偏好，但禁用某些 Cookie 可能会影响服务的部分功能。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('第三方服务')}</h2>
        <p>
          {t('我们可能会使用第三方服务提供商来协助我们运营服务，包括但不限于：')}
        </p>
        <ul>
          <li>{t('云基础设施服务提供商')}</li>
          <li>{t('支付处理服务商')}</li>
          <li>{t('数据分析服务')}</li>
          <li>{t('客户支持工具')}</li>
        </ul>
        <p>
          {t('这些第三方服务商仅在为我们提供服务所需的范围内访问您的信息，并有义务保护您的信息安全。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('数据安全')}</h2>
        <p>
          {t('我们采取行业标准的安全措施来保护您的个人信息，包括但不限于：')}
        </p>
        <ul>
          <li>{t('数据传输使用 TLS/SSL 加密')}</li>
          <li>{t('敏感数据存储采用加密处理')}</li>
          <li>{t('定期进行安全审计和漏洞评估')}</li>
          <li>{t('严格的访问控制和权限管理')}</li>
        </ul>
        <p>
          {t('尽管我们努力保护您的信息安全，但请注意互联网传输并非绝对安全，我们无法保证通过互联网传输的信息的绝对安全性。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('用户权利')}</h2>
        <p>{t('您享有以下关于个人信息的权利：')}</p>
        <ul>
          <li>{t('访问权：您有权请求访问我们持有的关于您的个人信息')}</li>
          <li>{t('更正权：您有权要求更正不准确的个人信息')}</li>
          <li>{t('删除权：您有权要求删除您的个人信息')}</li>
          <li>{t('数据可携带权：您有权以结构化格式获取您的数据')}</li>
          <li>{t('撤回同意权：您可以随时撤回对数据处理的同意')}</li>
        </ul>
        <p>
          {t('如需行使上述权利，请通过下方联系方式与我们联系。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('政策更新')}</h2>
        <p>
          {t('我们可能会不时更新本隐私政策。更新后的政策将在本页面发布，并标注最后更新日期。我们建议您定期查看本政策以了解最新的隐私保护措施。对于重大变更，我们将通过服务内通知或电子邮件的方式告知您。')}
        </p>
      </div>

      <div className='lp-legal-contact'>
        <h2>{t('联系我们')}</h2>
        <p>{t('如果您对本隐私政策有任何疑问，请联系我们')}</p>
        <p>
          <a href='mailto:privacy@teniucloud.com'>privacy@teniucloud.com</a>
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default LandingPrivacy;
