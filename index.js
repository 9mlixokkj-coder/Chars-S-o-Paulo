const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const axios = require('axios');
require('dotenv').config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
  console.log(`${client.user.tag} online!`);

  const commands = [
    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Mostra a skin/avatar de uma conta Roblox')
      .addStringOption(option =>
        option
          .setName('nick')
          .setDescription('Nick da conta Roblox')
          .setRequired(true)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log('Slash command /avatar registrado!');
  } catch (err) {
    console.error(err);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'avatar') {
    const nick = interaction.options.getString('nick');

    await interaction.deferReply();

    try {
      // PEGAR ID DO USUÁRIO ROBLOX
      const userResponse = await axios.post(
        'https://users.roblox.com/v1/usernames/users',
        {
          usernames: [nick],
          excludeBannedUsers: false
        }
      );

      const userData = userResponse.data.data[0];

      if (!userData) {
        return interaction.editReply({
          content: '❌ Usuário Roblox não encontrado.'
        });
      }

      const userId = userData.id;

      // PEGAR IMAGEM DA SKIN
      const avatarResponse = await axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=720x720&format=Png&isCircular=false`
      );

      const avatarUrl = avatarResponse.data.data[0].imageUrl;

      // LINK DO PERFIL
      const profileUrl = `https://www.roblox.com/users/${userId}/profile`;

      // EMBED
      const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`Avatar de ${nick}`)
        .setImage(avatarUrl)
        .setFooter({
          text: `Solicitado por ${interaction.user.username}`
        });

      // BOTÕES
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('📥 Baixar Skin')
          .setStyle(ButtonStyle.Link)
          .setURL(avatarUrl),

        new ButtonBuilder()
          .setLabel('👤 Ver Perfil no Roblox')
          .setStyle(ButtonStyle.Link)
          .setURL(profileUrl)
      );

      await interaction.editReply({
        embeds: [embed],
        components: [row]
      });

    } catch (err) {
      console.error(err);

      interaction.editReply({
        content: '❌ Erro ao buscar avatar.'
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
