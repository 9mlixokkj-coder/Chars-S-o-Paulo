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

// CONFIG

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// cooldown
const cooldown = new Map();

// comando
const commands = [
    new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Mostra a skin de um usuário do Roblox')
        .addStringOption(option =>
            option.setName('nome')
                .setDescription('Nome do usuário do Roblox')
                .setRequired(true))
        .toJSON()
];

// registrar comando (instantâneo no servidor)
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
    await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
    );
    console.log('Comando registrado!');
})();

client.once('ready', () => {
    console.log(`Logado como ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // canal permitido
    if (interaction.channel.id !== process.env.CANAL_ID) {
        return interaction.reply({
            content: "Use o comando no canal correto.",
            ephemeral: true
        });
    }

    // cooldown
    const userId = interaction.user.id;

    if (cooldown.has(userId)) {
        const tempo = (cooldown.get(userId) - Date.now()) / 1000;
        if (tempo > 0) {
            return interaction.reply({
                content: `Espere ${tempo.toFixed(1)}s.`,
                ephemeral: true
            });
        }
    }

    cooldown.set(userId, Date.now() + 5000);
    setTimeout(() => cooldown.delete(userId), 5000);

    if (interaction.commandName === 'avatar') {
        const username = interaction.options.getString('nome');

        try {
            await interaction.deferReply();

            // pegar ID
            const userRes = await axios.post('https://users.roblox.com/v1/usernames/users', {
                usernames: [username],
                excludeBannedUsers: true
            });

            if (!userRes.data.data.length) {
                return interaction.editReply("Usuário não encontrado.");
            }

            const userIdRoblox = userRes.data.data[0].id;

            // pegar avatar (corpo inteiro)
            const avatarRes = await axios.get(
                `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userIdRoblox}&size=720x720&format=Png&isCircular=false`
            );

            const avatarUrl = avatarRes.data.data[0].imageUrl;

            // embed bonita
            const embed = new EmbedBuilder()
                .setTitle(`Avatar de ${username}`)
                .setColor(0x2b2d31)
                .setImage(avatarUrl)
                .setFooter({ text: `Solicitado por ${interaction.user.username}` });

            // botão download
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Baixar Skin')
                    .setStyle(ButtonStyle.Link)
                    .setURL(avatarUrl)
            );

            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

        } catch (err) {
            console.error(err);
            interaction.editReply("Erro ao buscar a skin.");
        }
    }
});

client.login(process.env.TOKEN);