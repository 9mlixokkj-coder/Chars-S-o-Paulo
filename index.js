require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const axios = require('axios');

// CLIENT

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// COOLDOWN

const cooldown = new Map();

// SLASH COMMAND

const commands = [
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Mostra a skin/avatar de um usuário do Roblox')
        .addStringOption(option =>
            option
                .setName('nome')
                .setDescription('Nome do usuário Roblox')
                .setRequired(true)
        )
        .toJSON()
];

// REGISTRAR COMANDO

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID,
                process.env.GUILD_ID
            ),
            { body: commands }
        );

        console.log('✅ Slash command registrado!');

    } catch (err) {

        console.error(err);
    }

})();

// READY

client.once('ready', () => {
    console.log(`✅ Logado como ${client.user.tag}`);
});

// INTERACTION

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // cooldown

    const userId = interaction.user.id;

    if (cooldown.has(userId)) {

        const tempo = (cooldown.get(userId) - Date.now()) / 1000;

        if (tempo > 0) {

            return interaction.reply({
                content: `⏳ Espere ${tempo.toFixed(1)}s.`,
                ephemeral: true
            });
        }
    }

    cooldown.set(userId, Date.now() + 5000);

    setTimeout(() => {
        cooldown.delete(userId);
    }, 5000);

    // COMANDO AVATAR

    if (interaction.commandName === 'avatar') {

        const username = interaction.options.getString('nome');

        try {

            await interaction.deferReply();

            // BUSCAR ID ROBLOX

            const userRes = await axios.post(
                'https://users.roblox.com/v1/usernames/users',
                {
                    usernames: [username.trim()],
                    excludeBannedUsers: false
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (
                !userRes.data ||
                !userRes.data.data ||
                userRes.data.data.length === 0
            ) {

                return interaction.editReply({
                    content: '❌ Usuário Roblox não encontrado.'
                });
            }

            const userData = userRes.data.data[0];
            const userIdRoblox = userData.id;

            // PEGAR AVATAR

            const avatarRes = await axios.get(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userIdRoblox}&size=720x720&format=Png&isCircular=false`
            );

            if (
                !avatarRes.data ||
                !avatarRes.data.data ||
                avatarRes.data.data.length === 0
            ) {

                return interaction.editReply({
                    content: '❌ Não foi possível carregar o avatar.'
                });
            }

            const avatarUrl = avatarRes.data.data[0].imageUrl;

            // LINK PERFIL

            const profileUrl =
                `https://www.roblox.com/users/${userIdRoblox}/profile`;

            // EMBED

            const embed = new EmbedBuilder()
                .setTitle(`Avatar de ${userData.name}`)
                .setColor(0x2b2d31)
                .setImage(avatarUrl)
                .setFooter({
                    text: `Solicitado por ${interaction.user.username}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // BOTÕES

            const row = new ActionRowBuilder().addComponents(

                new ButtonBuilder()
                    .setLabel('Baixar Skin')
                    .setEmoji('📥')
                    .setStyle(ButtonStyle.Link)
                    .setURL(avatarUrl),

                new ButtonBuilder()
                    .setLabel('Ver Perfil no Roblox')
                    .setEmoji('👤')
                    .setStyle(ButtonStyle.Link)
                    .setURL(profileUrl)
            );

            // ENVIAR

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (err) {

            console.error('ERRO:', err.response?.data || err.message);

            return interaction.editReply({
                content: '❌ Erro ao buscar a skin.'
            });
        }
    }
});

// LOGIN

client.login(process.env.TOKEN);
