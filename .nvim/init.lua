-- 🤖 Auth0 Agent Review — project-local nvim config
-- Loaded by nvim-projectconfig or exrc

vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true

-- Mark TypeScript/TSX as primary filetypes
vim.g.project_name = "auth0-agent-review"

-- LSP: ensure tsserver and tailwindcss are started
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  callback = function()
    vim.lsp.start({
      name = "tsserver",
      cmd = { "typescript-language-server", "--stdio" },
      root_dir = vim.fn.getcwd(),
      settings = {
        typescript = { inlayHints = { includeInlayParameterNameHints = "all" } },
      },
    })
  end,
})

-- Useful keymaps for this project
vim.keymap.set("n", "<leader>rd", ":!npm run dev<CR>", { desc = "Run dev server" })
vim.keymap.set("n", "<leader>ps", ":!npx prisma studio<CR>", { desc = "Prisma studio" })
vim.keymap.set("n", "<leader>pm", ":!npx prisma migrate dev<CR>", { desc = "Prisma migrate" })
