const path = require('path');
const createPaginatedPages = require('gatsby-paginate');

const { createFilePath } = require('gatsby-source-filesystem');

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions;

  return graphql(`
    {
      allMarkdownRemark(
        limit: 1000
        sort: { order: DESC, fields: frontmatter___date }
      ) {
        edges {
          node {
            id
            fields {
              slug
            }
            tableOfContents(
              maxDepth: 3
            )            
            frontmatter {
              tags
              templateKey
              slug
              id
              title
              url: slug
              date
              tags
              description
              headerImage
            }
          }
        }
      }
    }
  `).then((result) => {
    if (result.errors) {
      return Promise.reject(result.errors);
    }

    const { edges = [] } = result.data.allMarkdownRemark;

    const tagSet = new Set();

    createPaginatedPages({
      edges,
      createPage,
      pageTemplate: 'src/templates/index.js',
      context: {
        totalCount: edges.length,
      },
      pathPrefix: 'pages',
      buildPath: (index, pathPrefix) => {
        if (index > 1) {
          return `${pathPrefix}/${index}`;
        }
        return '/';
      },
    });

    // 創建文章頁面
    edges.forEach(({ node }, index) => {
      const { id, frontmatter, fields } = node;
      const { slug, tags, templateKey } = frontmatter;

      // 讀取標籤
      if (tags) {
        tags.forEach(item => tagSet.add(item));
      }

      // 允许自定义地址
      let $path = fields.slug;
      if (slug) {
        $path = slug;
      }

      const component = templateKey || 'blog-post';

      createPage({
        path: $path,
        tags,
        component: path.resolve(`src/templates/${String(component)}.js`),
        // additional data can be passed via context
        context: {
          id,
          index,
        },
      });
    });

    // 創建標籤頁面
    return tagSet.forEach((tag) => {
      createPage({
        path: `/tag/${tag}`,
        component: path.resolve('src/templates/tag.js'),
        context: {
          tag,
        },
      });
    });
  });
};

exports.onCreateWebpackConfig = ({ plugins, actions }) => {
  actions.setWebpackConfig({
    plugins: [
      plugins.contextReplacement(
        /highlight\.js\/lib\/languages$/,
        new RegExp(`^./(${['javascript', 'bash'].join('|')})$`),
      ),
    ],
  });
};


exports.onCreateNode = ({ node, getNode, actions }) => {
  const { createNodeField } = actions;

  if (node.internal.type === 'MarkdownRemark') {
    // 如果markdown的frontmatter里面有slug的话，直接读取
    let { slug = '' } = node.frontmatter;

    if (slug === null || slug.trim() === '') {
      slug = createFilePath({ node, getNode, basePath: 'pages' });
    }

    createNodeField({
      node,
      name: 'slug',
      value: slug,
    });
  }
};
