import React from 'react';
import { useTranslation } from 'react-i18next';
import LegalPageLayout from '../../components/layout/LegalPageLayout';

const TermsOfService = () => {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      title={t('服务条款')}
      subtitle={t('最后更新日期：2025 年 1 月 1 日')}
    >
      <div className='lp-legal-section'>
        <p>
          {t('欢迎使用 Teniu Cloud 服务。以下条款和条件（以下简称"本条款"）构成您与 Teniu Cloud（以下简称"我们"）之间具有法律约束力的协议。使用我们的服务即表示您同意受本条款的约束。')}
        </p>
      </div>

      <hr className='lp-legal-divider' />

      <div className='lp-legal-section'>
        <h2>{t('服务描述')}</h2>
        <p>
          {t('Teniu Cloud 是一个去中心化的智能算力共享平台，提供以下核心服务：')}
        </p>
        <ul>
          <li>{t('AI 模型 API 聚合与代理服务，支持多种主流 AI 模型')}</li>
          <li>{t('算力节点共享服务，允许用户将本地计算资源共享到云端')}</li>
          <li>{t('智能网关客户端，用于连接本地服务与 Teniu Cloud 网络')}</li>
          <li>{t('用户账户管理、配额计费和令牌管理功能')}</li>
        </ul>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('用户账户')}</h2>
        <p>{t('注册和使用我们的服务时，您需要：')}</p>
        <ul>
          <li>{t('提供真实、准确、完整的注册信息')}</li>
          <li>{t('妥善保管您的账户凭证，包括密码和 API 密钥')}</li>
          <li>{t('对通过您的账户进行的所有活动负责')}</li>
          <li>{t('在发现任何未经授权使用您账户的情况时，立即通知我们')}</li>
        </ul>
        <p>
          {t('我们保留在发现违反本条款行为时，暂停或终止用户账户的权利。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('可接受的使用')}</h2>
        <p>{t('使用我们的服务时，您同意不得：')}</p>
        <ul>
          <li>{t('使用服务从事任何违法活动')}</li>
          <li>{t('试图未经授权访问其他用户的数据或系统')}</li>
          <li>{t('传播恶意软件、病毒或其他有害程序')}</li>
          <li>{t('对服务进行反向工程、反编译或其他破坏性操作')}</li>
          <li>{t('利用服务发送垃圾邮件或进行网络钓鱼')}</li>
          <li>{t('以任何方式干扰服务的正常运行或其他用户的使用')}</li>
          <li>{t('转售或未经授权分享您的 API 密钥和访问令牌')}</li>
        </ul>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('计费与支付')}</h2>
        <p>
          {t('我们的服务采用按量计费模式。具体费用基于您使用的 API 调用次数和消耗的计算资源计算。所有费用均以平台显示的价格为准。我们保留合理调整价格的权利，并将在调整前提前通知用户。')}
        </p>
        <p>
          {t('对于共享算力的节点用户，收益分配规则以平台公布的最新方案为准。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('知识产权')}</h2>
        <p>
          {t('Teniu Cloud 平台及其所有相关技术、商标、标识、界面设计、文档等内容受知识产权法律保护。未经我们书面许可，您不得复制、修改、分发或创建基于我们服务的衍生作品。')}
        </p>
        <p>
          {t('您通过我们的服务生成的内容，其知识产权归属遵循相关 AI 模型提供商的条款。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('免责声明')}</h2>
        <p>
          {t('我们的服务按"现状"提供，不提供任何明示或暗示的担保。在法律允许的最大范围内，我们不对以下情况承担责任：')}
        </p>
        <ul>
          <li>{t('因不可抗力导致的服务中断或数据丢失')}</li>
          <li>{t('第三方 AI 模型生成内容的准确性或适用性')}</li>
          <li>{t('用户因违反本条款而遭受的任何损失')}</li>
          <li>{t('因网络环境导致的服务延迟或连接问题')}</li>
        </ul>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('责任限制')}</h2>
        <p>
          {t('在任何情况下，我们对您因使用或无法使用服务而产生的间接损失、附带损失、特殊损失、惩罚性损失或后果性损失不承担责任。我们的总责任不超过您在引发索赔的事件发生前 12 个月内向我们支付的费用总额。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('服务变更与终止')}</h2>
        <p>
          {t('我们保留以下权利：')}
        </p>
        <ul>
          <li>{t('随时修改、暂停或终止部分或全部服务')}</li>
          <li>{t('更新本服务条款（更新后的条款将在平台上公布）')}</li>
          <li>{t('对违反本条款的用户采取限制或终止服务的措施')}</li>
        </ul>
        <p>
          {t('我们将尽力在服务发生重大变更时提前通知用户。')}
        </p>
      </div>

      <div className='lp-legal-section'>
        <h2>{t('适用法律')}</h2>
        <p>
          {t('本条款受中华人民共和国法律管辖。因本条款引起的或与本条款相关的任何争议，双方应首先通过友好协商解决。协商不成的，任何一方均可向有管辖权的人民法院提起诉讼。')}
        </p>
      </div>

      <div className='lp-legal-contact'>
        <h2>{t('联系我们')}</h2>
        <p>{t('如果您对本服务条款有任何疑问，请联系我们')}</p>
        <p>
          <a href='mailto:legal@teniucloud.com'>legal@teniucloud.com</a>
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default TermsOfService;
