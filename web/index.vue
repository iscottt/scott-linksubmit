<template>
  <div class="nv-admin-page">
    <div class="page-title">
      <span>提交网站收录</span>
      <button class="top-circle" type="primary" @click="showModal = true">
        <i class="el-icon-setting"></i>
      </button>
    </div>

    <div class="page-content flex-grow">
      <div class="action-container mb-10">
        <NButton :disabled="checkRows < 1" type="primary" @click="batchPush">批量推送</NButton>
      </div>
      <dataTable :bordered="true" :row-key="rowKey" :columns="columns" :data="tableData" :pagination="pagination"
        :remote="true" @update:checked-row-keys="handleCheck" />
    </div>

    <n-modal mask-closable v-model:show="showModal" style="width: 500px">
      <div class="modal-plu-container">
        <pd-form :config="formConfig" :data="formData" @submit="handleSubmit"></pd-form>
      </div>
    </n-modal>
  </div>
</template>

<script>
import { h } from 'vue'
function formatTime(value) {
  if (value) {
    let date = new Date(value * 1000) // 时间戳为秒：10位数
    //let date = new Date(value)	// 时间戳为毫秒：13位数
    let year = date.getFullYear()
    let month = date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1
    let day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate()
    let hour = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours()
    let minute = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes()
    let second = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds()
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  } else {
    return ''
  }
}
// 用到的组件
const { dataTable, button: NButton, tag: NTag, modal: NModal } = nv.components
const createColumns = (handlePush) => {
  return [
    {
      type: 'selection',
    },
    {
      title: '标题',
      key: 'title',
    },
    {
      title: '状态',
      key: 'status',
      render(row) {
        return h(NTag, { type: row.status == 'publish' ? 'success' : 'error', size: 'small' }, { default: () => (row.status == 'publish' ? '已发布' : '未发布') })
      },
    },
    {
      title: '排序',
      key: 'order',
    },
    {
      title: '发布日期',
      key: 'created_time',
      render(row) {
        return formatTime(row.created_time / 1000)
      },
    },
    {
      title: '操作',
      key: 'actions',
      render(row) {
        if (row.isPushed == 1) {
          return h('div', '已推送')
        } else {
          return [
            h(
              NButton,
              {
                text: true,
                size: 'small',
                type: 'primary',
                onClick: () => handlePush(row),
              },
              {
                default: () =>
                  h(
                    'i',
                    {
                      class: 'el-icon-upload2',
                    },
                    ' 推送'
                  ),
              }
            ),
          ]
        }
      },
    },
  ]
}
export default {
  components: {
    dataTable,
    NButton,
    NTag,
    NModal,
  },
  data() {
    return {
      formConfig: {
        form: {
          labelWidth: '7em',
          size: 'large',
          submitText: '保存设置',
        },
        items: [
          {
            label: '配置',
            type: 'FormSubtitle',
          },
          {
            label: '准入密钥',
            type: 'Input',
            prop: 'push_token',
            config: {
              placeholder: '请输入...',
              clearable: true,
            },
            desc: '百度搜索资源平台-资源提交准入密钥',
          },
        ],
      },
      showModal: false,
      formData: {},
      pagination: {
        pageSize: 10,
        onChange: (page) => this.pageChange(page),
      },
      tableData: [],
      columns: [],
      checkRows: [],
      rowKey: (row) => row.id,
      statusOpts: [
        {
          label: '已发布',
          value: 'publish',
        },
        {
          label: '草稿',
          value: 'draft',
        },
      ],
    }
  },
  methods: {
    // 批量推送
    batchPush() {
      $dialog.info({
        title: '提示',
        showIcon: false,
        content: '是否确认推送选中文章？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
          const urls = []
          this.checkRows.map((item) => {
            urls.push(`${this.site}/${item.slug}`)
          })
          const params = {
            site: this.site,
            token: this.formData.push_token,
            urls,
          }
          this.pushFunction(params)
        },
      })
    },
    // 选中的数据
    handleCheck(checkRows) {
      this.checkRows = checkRows
    },
    // 提交密钥表单
    submitHandle() {
      this.$refs.formRef.validate((errors) => {
        if (!errors) {
          this.modalLoading = true
          this.$axios({
            method: 'post',
            url: this.$API + this.modalType == 'add' ? '/salary/microblog-insert' : '/salary/microblog-edit',
            data: {
              ...this.model,
            },
          })
            .then(() => {
              this.requestData()
            })
            .finally(() => {
              this.modalLoading = false
              this.showModal = false
            })
        }
      })
    },
    // 获取文章数据
    requestData() {
      window.$fullLoading.start()
      this.tableData = []
      this.$axios({
        method: 'post',
        url: this.$API + '/scott/query-post',
        data: {
          pageNum: this.pagination.page,
          pageSize: this.pagination.pageSize,
        },
      })
        .then(({ data }) => {
          this.tableData = data.posts
          this.pagination.itemCount = data.page.total
        })
        .finally(() => {
          window.$fullLoading.finish()
        })
    },
    // 获取站点信息
    requestSite() {
      this.$axios({
        method: 'post',
        url: this.$API + '/nv/get-options',
        data: {
          names: ['nv_home_url', 'push_token'],
        },
      }).then(({ data }) => {
        this.site = data.nv_home_url
        this.formData.push_token = data.push_token
      })
    },
    // 提交到百度收录
    pushFunction(params, row) {
      $fullLoading.start('正在推送...')
      this.$axios({
        method: 'post',
        url: 'https://api.scott-studio.cn/api/baidu-push',
        data: params,
      })
        .then((res) => {
          if (res.data.success) {
            this.updatePostMeta(row)
          } else {
            $message.warning(`推送失败：${res.data.message}`)
          }
        })
        .catch((error) => {
          $message.warning('推送失败')
          console.log(error)
        })
        .finally(() => {
          $fullLoading.end()
        })
    },
    // 更新文章meta
    updatePostMeta(row) {
      const ids = []
      if (this.checkRows.length > 0) this.checkRows.map((row) => ids.push(row.id))
      else ids.push(row.id)
      this.$axios({
        method: 'post',
        url: this.$API + '/scott/push-post',
        data: {
          ids,
        },
      }).then(({ data }) => {
        if (data.code == 0) {
          $message.success('推送成功')
          this.requestData()
        }
      })
    },
    // 单个推送
    handlePush(row) {
      const params = {
        site: this.site,
        token: this.formData.push_token,
        urls: [`${this.site}/${[row.slug]}`],
      }
      this.pushFunction(params, row)
    },
    // 翻页
    pageChange(page) {
      this.pagination.page = page
      this.requestData()
    },
    // 保存准入密钥
    handleSubmit() {
      $fullLoading.start()
      this.$axios({
        method: 'post',
        url: this.$API + '/nv/set-options',
        data: this.formData,
      })
        .then(({ data }) => {
          if (!this.$isSuccess(data)) {
            return
          }
          $message.success('保存成功')
          this.showModal = false
        })
        .catch((error) => {
          $message.warning('保存设置请求失败')
          console.log(error)
        })
        .finally(() => {
          $fullLoading.end()
        })
    },
  },
  mounted() {
    this.columns = createColumns(this.handlePush)
    this.requestSite()
    this.requestData()
  },
}
</script>
<style>
.modal-plu-container button {
  --secondary-color: #4ebbff;
  --primary-color: #007dff;
  --primary-opacity-3: rgba(0, 125, 255, 0.3);
}
</style>
<style scoped>
.modal-plu-container {
  padding: 20px;
  background-color: #fff;
  min-width: 400px;
  border-radius: 10px;
}

.nv-admin-page {
  padding: 0 15px;
  display: flex;
  flex-direction: column;
  min-height: var(--fullvh);
}

@media (max-width: 991.5px) {
  .nv-admin-page {
    min-height: calc(var(--fullvh) - 50px);
  }
}

.nv-admin-page .page-title {
  font-size: 24px;
  color: var(--gray-2);
  text-shadow: 2px 2px 2px var(--gray-opacity-2), -1px -1px var(--white-default);
  line-height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

@media (max-width: 991.5px) {
  .nv-admin-page .page-title {
    font-size: 22px;
    line-height: 50px;
  }
}

@media (min-width: 991.5px) {
  .nv-admin-page .page-title {
    padding: 0 10px;
  }
}

.nv-admin-page .page-title>span {
  margin-right: 8px;
}

.nv-admin-page .page-title button.top-circle {
  position: relative;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: radial-gradient(at top left, var(--analogous-color), var(--primary-color));
  box-shadow: 3.5px 3.5px 8px var(--primary-opacity-3), -1px -1px var(--white-default), -3.5px -3.5px 8px var(--white-default);
  display: grid;
  justify-content: center;
  align-content: center;
  grid-template-columns: auto auto;
  color: #fff;
  border: 0;
  transition: cubic-bezier(0.5, 2.5, 0.8, 1) 0.5s;
}

@media (max-width: 991.5px) {
  .nv-admin-page .page-title button.top-circle {
    display: none;
  }
}

.nv-admin-page .page-title button.top-circle:hover {
  transform: scale(1.2);
  box-shadow: 8px 8px 8px var(--primary-opacity-4), 0 0 transparent, 0 0 0 transparent;
}

.nv-admin-page .page-content {
  background: var(--white-default);
  box-shadow: 5px 8px 12px var(--gray-opacity-1);
  padding: 32px;
  border-radius: 16px;
}

@media (max-width: 991.5px) {
  .nv-admin-page .page-content {
    padding: 15px;
    margin: 0 -15px;
    border-radius: 0;
    box-shadow: 0 1px var(--gray-7), 0 -1px var(--gray-7);
  }
}

.nv-admin-page .page-content:last-child {
  margin-bottom: 20px;
}

.nv-admin-page .page-content.is-full {
  border-radius: 8px 8px 0 0;
  margin-bottom: 0;
}

.is-dark .nv-admin-page .page-content {
  box-shadow: 3px 3px 12px var(--gray-opacity-3), 0 0 0 1px #ffffff08 inset;
}

.is-dark .page-title button.top-circle {
  background: radial-gradient(at 6px 6px, var(--secondary-color), var(--primary-color-pressed));
  box-shadow: 10px 10px 10px #000, 0 0 0 1px #fff3 inset;
}

.is-dark .page-title button.top-circle:hover {
  box-shadow: 10px 10px 10px #000, 0 0 0 1px #fff3 inset;
}
</style>
