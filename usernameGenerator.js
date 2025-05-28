const ADJECTIVES = [
    "swift","brave","clever","mighty","fuzzy","lucky","wild","noble","happy","silent","sneaky","fierce","gentle","shiny","stormy","cosmic","frosty","shadow","solar","electric","ancient","giant","tiny","noisy","quiet","silly","serious","crazy","calm","graceful","awkward","curious","lazy","speedy","loyal","proud","shy","bold","fearless","timid","wise","silly","playful","eager","sleepy","hungry","chubby","slim","fancy","plain","sparkly","gloomy","sunny","icy","fiery","rusty","fresh","dizzy","cheerful","moody","witty","daring","stubborn","gentle","elegant","clumsy","crafty","scrappy","rowdy","nifty","zany","quirky","jolly","sassy","spooky","jumpy","dreamy","weird","fancy","breezy","tough","cuddly","funky","snappy","calm","stormy","crimson","emerald","ivory","golden","silver","onyx","opal","topaz","jade","amber","pearl","ruby","sapphire","cobalt","scarlet","indigo","violet","turquoise","azure","minty","peachy","hazel","mahogany","cherry","smoky","midnight","dawn","dusk","sunset","sunrise","dappled","striped","spotted","glossy","matte","neon","pastel","vivid","muted","regal","royal","humble","urban","rustic","sage","peppy","zippy","whimsical","frosted","fluffy","woolly","silky","gritty","slick","shaggy","tidy","messy","orderly","chaotic","whispering","thundering","howling","chirping","buzzing","roaring","hissing","whistling","croaky","barking","meowing","purring","yapping","growling","bleating","crowing","hooting","cooing","screeching","squawking","peckish","brawny","burly","dapper","jaunty","spry","spunky","plucky","sprightly","spruced","jaunty","zestful","boisterous","vivacious","bubbly","gleaming","glimmering","twinkling","sparkling","glowing","blazing","scorching","icy","arctic","polar","tropical","desert","alpine","maritime","prairie","woodland","jungle","swampy","rocky","sandy","muddy","mossy","thorny","leafy","bushy","flowery","fruity","nutty","herbal","zesty","fiery","salty","sweet","sour","bitter","umami","earthy","smoky","woody","peppery","spicy","buttery","creamy","crunchy","crispy","juicy","gooey","chewy","velvety","silky","chunky","runny","flaky","crumbly","smooth","rough","bumpy","ragged","scruffy","tangled","unkempt","trim","polished","sleek","slick","tidy","neat","spotless","grimy","dusty","muddy","soggy","damp","parched","moist","soaked","drippy","sodden","musty","fresh","stale","ripe","overripe","underripe","wilted","perky","droopy"
];

const ANIMALS = [
    "dino","tiger","wolf","dragon","lion","panther","eagle","fox","bear","otter","falcon","owl","panda","shark","rabbit","snake","rhino","monkey","whale","giraffe","zebra","hippo","kangaroo","koala","wombat","platypus","lemur","sloth","armadillo","badger","beaver","bison","buffalo","camel","capybara","cheetah","chimp","cougar","coyote","crab","crow","deer","dog","dolphin","donkey","duck","ferret","flamingo","frog","gazelle","goat","goose","guinea","hamster","hare","hedgehog","heron","hyena","ibis","iguana","jackal","jaguar","jellyfish","kiwi","lemur","leopard","lizard","llama","lobster","lynx","manatee","mink","mole","moose","mouse","narwhal","newt","ocelot","octopus","opossum","orangutan","oryx","ostrich","otter","owl","ox","parrot","peacock","pelican","penguin","pig","pigeon","platypus","pony","porcupine","quail","rabbit","raccoon","ram","rat","raven","reindeer","rooster","salamander","seal","serval","sheep","shrew","skunk","snail","sparrow","spider","squid","squirrel","starling","stork","swan","tapir","termite","tern","toad","turkey","turtle","vicuna","viper","vulture","wallaby","walrus","weasel","wildebeest","wolverine","wren","yak","zebu","antelope","baboon","barnacle","bat","bee","boar","bobcat","caribou","cassowary","caterpillar","cicada","clam","cod","coral","cormorant","coyote","crane","cuttlefish","dingo","eel","finch","firefly","gannet","gecko","gerbil","gnu","goldfish","grasshopper","grouse","gull","haddock","halibut","heron","hornet","ibex","impala","jackrabbit","katydid","kingfisher","ladybug","lamprey","langur","lark","locust","maggot","manta","marmoset","marten","mayfly","midge","mole","mollusk","mongoose","muskox","numbat","oyster","pangolin","partridge","peafowl","perch","pika","pipit","polecat","prawn","ptarmigan","puffin","quokka","quoll","ray","redstart","robin","rook","sable","sardine","scorpion","seaurchin","shrike","shrimp","snipe","sole","songbird","sora","sparrowhawk","spoonbill","sprat","starfish","stoat","sturgeon","suckerfish","suricate","swift","tamarin","tang","tarsier","tenrec","tern","thrush","titmouse","toadfish","topi","tortoise","toucan","trout","tuatara","tuna","urchin","vicuna","vole","vulpine","warbler","wasp","waterbuck","wattled","waxwing","whippet","whitefish","whooper","widgeon","woodchuck","woodcock","woodlouse","worm","wryneck","yabby","yellowhammer","zokor","zorilla"
];

// Utility: Pick random element from array
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a random username and ensures it's not already used in the database.
 * Will attempt up to 10 times to find a unique name, then appends more random digits.
 * Returns a Promise that resolves to a unique username.
 */
function generateUniqueUsername(mode = "alltime", dateKey = "all") {
    return new Promise(async (resolve, reject) => {
        let attempts = 0;
        let username;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
            username = `${pick(ADJECTIVES)}-${pick(ANIMALS)}}`;
            // Check both alltime and today's daily by default
            let existsAlltime = await usernameExistsInLeaderboard(username, "alltime", "all");
            let existsDaily = await usernameExistsInLeaderboard(username, "daily", getTodayKey());
            if (!existsAlltime && !existsDaily) {
                resolve(username);
                return;
            }
            attempts++;
        }
        username = `${username}-${Date.now()}}`;
        resolve(username.toUpperCase());
    });
}

function usernameExistsInLeaderboard(username, mode, dateKey) {
    return firebase.database().ref(`leaderboard/${mode}/${dateKey}`)
        .orderByChild("username").equalTo(username).once("value")
        .then(snap => snap.exists());
}

function getTodayKey() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}

