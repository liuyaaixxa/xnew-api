import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import LegalPageLayout from '../../components/layout/LegalPageLayout';

const GITHUB_RELEASE_BASE =
  'https://github.com/liuyaaixxa/teniulink-node-client/releases/download/v0.1.0';

const Docs = () => {
  const { t } = useTranslation();

  return (
    <LegalPageLayout
      title={t('用户文档')}
      subtitle={t('从注册到共享服务，一站式指南')}
    >
      {/* 快速开始 */}
      <div className='lp-legal-section'>
        <h2>{t('快速开始')}</h2>
        <p>
          {t('只需 3 步，即可开始通过 Teniu.AI 共享算力并赚取收益。')}
        </p>
        <div className='lp-legal-card-grid'>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <span style={{ fontSize: 28 }}>①</span>
            </div>
            <h3>{t('注册账户')}</h3>
            <p>
              {t('前往')}{' '}
              <Link to='/register' style={{ color: '#00ff88' }}>
                {t('注册页面')}
              </Link>{' '}
              {t('创建您的 Teniu.AI 账户。')}
            </p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <span style={{ fontSize: 28 }}>②</span>
            </div>
            <h3>{t('下载安装')}</h3>
            <p>
              {t('根据您的操作系统')}{' '}
              <a href='#download-client' style={{ color: '#00ff88' }}>
                {t('下载客户端')}
              </a>
              {t('并完成安装。')}
            </p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <span style={{ fontSize: 28 }}>③</span>
            </div>
            <h3>{t('共享赚取')}</h3>
            <p>
              {t('登录客户端，配置服务，连接到 Teniu.AI 网络开始赚取。')}
            </p>
          </div>
        </div>
      </div>

      {/* 注册账户 */}
      <div className='lp-legal-section'>
        <h2>{t('注册账户')}</h2>
        <p>
          {t('访问')}{' '}
          <Link to='/register' style={{ color: '#00ff88' }}>
            {t('注册页面')}
          </Link>
          {t('，填写邮箱和密码即可创建账户。注册完成后，您将获得一个专属的 API Key，用于客户端连接。')}
        </p>
        <ul>
          <li>{t('使用有效的邮箱地址注册，便于找回密码')}</li>
          <li>{t('注册后请妥善保管您的 API Key')}</li>
          <li>
            {t('如已有账户，可直接')}{' '}
            <Link to='/login' style={{ color: '#00ff88' }}>
              {t('登录')}
            </Link>
          </li>
        </ul>
      </div>

      {/* 下载安装客户端 */}
      <div className='lp-legal-section' id='download-client'>
        <h2>{t('下载安装客户端')}</h2>
        <p>
          {t('Teniu Link 节点客户端支持 macOS、Windows 和 Linux。请根据您的操作系统选择对应版本下载。')}
        </p>
        <div className='lp-legal-card-grid'>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg
                viewBox='0 0 24 24'
                fill='currentColor'
                width='32'
                height='32'
              >
                <path d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z' />
              </svg>
            </div>
            <h3>macOS</h3>
            <p>{t('适用于 macOS 10.15+')}</p>
            <p>
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-arm64.dmg`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                DMG · ARM64
              </a>
              {' · '}
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-x64.dmg`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                DMG · x64
              </a>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {t('下载 .dmg 文件后双击打开，将应用拖入 Applications 文件夹即可完成安装。')}
            </p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg
                viewBox='0 0 24 24'
                fill='currentColor'
                width='32'
                height='32'
              >
                <path d='M3 12V6.5l8-1.1V12H3zm0 .5h8v6.6l-8-1.1V12.5zM12 12.5h9V3l-9 1.2v8.3zm0 .5v6.3L21 21v-8H12z' />
              </svg>
            </div>
            <h3>Windows</h3>
            <p>{t('适用于 Windows 10+')}</p>
            <p>
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-x64-setup.exe`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                Setup · x64
              </a>
              {' · '}
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-arm64-setup.exe`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                Setup · ARM64
              </a>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {t('下载安装程序后运行，按照向导提示完成安装。也提供免安装的 Portable 版本。')}
            </p>
          </div>
          <div className='lp-legal-card'>
            <div className='lp-legal-card-icon'>
              <svg
                viewBox='0 0 24 24'
                fill='currentColor'
                width='32'
                height='32'
              >
                <path d='M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 0 0-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.536.058.399.116.728.04.97-.249.68-.28 1.145-.106 1.484.174.334.535.47.94.601.81.2 1.91.135 2.774.6.926.466 1.866.67 2.616.47.526-.116.97-.464 1.208-.946.587-.003 1.23-.269 2.26-.334.699-.058 1.574.267 2.577.2.025.134.063.198.114.333l.003.003c.391.778 1.113 1.368 1.884 1.43.868.134 1.703-.272 2.191-.574.3-.18.599-.382.8-.6.404-.433.6-.985.71-1.388.037-.134.064-.198.084-.328.104.003.2 0 .295-.023a4.002 4.002 0 0 0 1.37-.726c.226-.186.39-.396.525-.55.202-.229.347-.466.462-.633.222-.32.395-.642.504-.857.058-.122.086-.198.116-.268a1.63 1.63 0 0 0-.12-.122l-.04-.036c-.168-.158-.375-.322-.57-.505-.088-.083-.163-.168-.276-.31-.095-.134-.222-.289-.36-.489-.135-.2-.29-.43-.398-.53-.072-.076-.206-.131-.368-.195-.162-.064-.37-.135-.573-.246-.202-.11-.412-.24-.586-.406-.37-.336-.585-.72-.8-1.123-.072-.138-.16-.273-.193-.398-.033-.126-.07-.253-.057-.38.07-.535.085-1.065-.136-1.535-.165-.36-.47-.563-.79-.845-.063-.058-.14-.126-.11-.2.06-.177.039-.388-.003-.6-.049-.256-.113-.383-.163-.622-.042-.174-.075-.374-.048-.546.032-.246.1-.408.158-.484l.008-.01c.054-.033.108-.073.165-.12a.674.674 0 0 0 .145-.135 1.127 1.127 0 0 0 .21-.468c.056-.301.023-.634-.07-.933-.117-.38-.32-.676-.48-.93-.076-.134-.143-.247-.197-.37-.046-.101-.083-.21-.064-.348.036-.296-.068-.588-.21-.776-.137-.188-.303-.298-.426-.382a1.453 1.453 0 0 0-.096-.059c.017-.258-.028-.455-.113-.613-.084-.163-.197-.263-.282-.334-.17-.138-.37-.224-.565-.283a4.356 4.356 0 0 0-.459-.111c-.212-.04-.381-.063-.469-.098-.036-.017-.028-.036-.012-.094.013-.054.04-.126.032-.227-.008-.1-.041-.232-.12-.357a.984.984 0 0 0-.381-.37c-.146-.083-.32-.128-.488-.144a2.558 2.558 0 0 0-.637.025c-.14.023-.27.055-.368.077-.097.024-.155.04-.184.03-.057-.013-.068-.023-.147-.074-.078-.05-.189-.133-.364-.198a1.564 1.564 0 0 0-.505-.1 2.017 2.017 0 0 0-.698.09c-.175.054-.315.127-.395.178-.013.008-.023.013-.035.02-.14-.073-.294-.113-.46-.134z' />
              </svg>
            </div>
            <h3>Linux</h3>
            <p>{t('支持 Ubuntu、Debian、CentOS 等')}</p>
            <p>
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-amd64.deb`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                DEB · amd64
              </a>
              {' · '}
              <a
                href={`${GITHUB_RELEASE_BASE}/Teniulink-Node-0.1.0-x86_64.rpm`}
                target='_blank'
                rel='noreferrer'
                style={{ color: '#00ff88' }}
              >
                RPM · x86_64
              </a>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {t('DEB 包适用于 Ubuntu/Debian，RPM 包适用于 CentOS/Fedora。使用 sudo dpkg -i 或 sudo rpm -i 命令安装。')}
            </p>
          </div>
        </div>
      </div>

      {/* 连接设备并共享服务 */}
      <div className='lp-legal-section'>
        <h2>{t('连接设备并共享服务')}</h2>
        <p>
          {t('安装完成后，按照以下步骤将您的设备连接到 Teniu.AI 网络：')}
        </p>
        <ul>
          <li>
            <strong>{t('启动客户端')}</strong> —{' '}
            {t('打开 Teniu Link 应用，使用您注册的账户登录。')}
          </li>
          <li>
            <strong>{t('配置 Ollama 服务')}</strong> —{' '}
            {t('确保本地已安装 Ollama 并运行。客户端会自动检测本地 Ollama 服务。如需手动配置，请在设置中填写 Ollama 服务地址（默认为 http://localhost:11434）。')}
          </li>
          <li>
            <strong>{t('连接网络')}</strong> —{' '}
            {t('点击"连接"按钮，您的设备将加入 Teniu.AI 网络，开始接受和处理 AI 推理任务。')}
          </li>
        </ul>
      </div>

      {/* 监控与收益 */}
      <div className='lp-legal-section'>
        <h2>{t('监控与收益')}</h2>
        <p>
          {t('设备连接成功后，您可以在')}{' '}
          <Link to='/console' style={{ color: '#00ff88' }}>
            {t('控制台')}
          </Link>{' '}
          {t('查看设备状态和收益情况：')}
        </p>
        <ul>
          <li>{t('实时查看设备在线状态和任务处理情况')}</li>
          <li>{t('查看累计收益和收益趋势图')}</li>
          <li>{t('管理您的 API Key 和账户设置')}</li>
        </ul>
      </div>

      {/* 常见问题 */}
      <div className='lp-legal-section'>
        <h2>{t('常见问题')}</h2>

        <h3>{t('客户端无法连接怎么办？')}</h3>
        <ul>
          <li>{t('检查网络连接是否正常')}</li>
          <li>{t('确认防火墙未阻止客户端访问')}</li>
          <li>{t('确保 Ollama 服务已启动（运行 ollama serve）')}</li>
          <li>{t('尝试重启客户端')}</li>
        </ul>

        <h3>{t('支持哪些 AI 模型？')}</h3>
        <p>
          {t('Teniu.AI 支持所有 Ollama 兼容的模型，包括 Llama、Mistral、Gemma、Qwen 等主流开源模型。您可以通过 ollama pull 命令下载所需模型。')}
        </p>

        <h3>{t('收益如何结算？')}</h3>
        <p>
          {t('收益根据您的设备处理的任务量实时计算，并在控制台中显示。具体结算规则和提现方式请参考控制台中的收益页面。')}
        </p>
      </div>

      {/* 联系我们 */}
      <div className='lp-legal-contact'>
        <h2>{t('联系我们')}</h2>
        <p>{t('如有任何问题或需要帮助，欢迎联系我们')}</p>
        <p>
          <a href='mailto:support@teniucloud.com'>support@teniucloud.com</a>
        </p>
      </div>
    </LegalPageLayout>
  );
};

export default Docs;
