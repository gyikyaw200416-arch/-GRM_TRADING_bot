bot.on("message:photo", async (ctx) => {
  const photo = ctx.message.photo;
  const fileId = photo[photo.length - 1].file_id;
  await ctx.reply(`File ID: \`${fileId}\``, { parse_mode: "Markdown" });
});
