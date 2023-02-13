var path = require('path')
add_action('init_express', () => {
  // 为聊天室注册一个前台访问页面文件夹
  register_static_url('/scott', path.join(__dirname, './web/'))
  add_submenu_page({
    parent_slug: 'plugins',
    page_title: 'scott-push插件设置',
    menu_title: 'scott-push插件设置',
    menu_slug: 'scott-push',
    power: 10,
    position: 9,
    component_url: '/scott/index.vue',
  })

  add_meta_box({
    post_types: ['article'],
    meta_box_slug: 'is-pushed',
    content: {
      title: '是否已推送',
      items: [
        {
          type: 'Select',
          meta_key: 'is_pushed',
          config: {
            disabled: true,
            options: [
              { label: '是', value: 1 },
              { label: '否', value: 2 },
            ],
          },
        },
      ],
    },
  })

  // 查询文章列表
  register_rest_route('scott', 'query-post', {
    methods: 'post',
    callback(data, req) {
      var { pageSize, pageNum } = data
      var posts = query_posts({
        post_type: 'article',
        status: 'publish',
        order: 'DESC',
        posts_per_page: pageSize || 10,
        current_page: pageNum || 1,
      })
      return {
        posts: posts.data.map(post => {
          return { ...post, isPushed: get_post_meta(post.id, 'is_pushed') }
        }),
        page: posts.pagination
      }
    },
  })


  // 推送文章
  register_rest_route('scott', 'push-post', {
    methods: 'post',
    callback(data, req) {
      var { ids } = data
      ids.map(id => {
        update_post_meta(id, 'is_pushed', 1)
      })
      return {
        message: "success",
        code: 0
      }
    },
  })

})
