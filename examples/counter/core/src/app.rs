use crux_core::{
    capability::Operation,
    macros::effect,
    render::{render, RenderOperation},
    Command,
};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};

// ANCHOR: model
#[derive(Default, Serialize)]
pub struct Model {
    count: Count,
}

#[derive(Serialize, Deserialize, Clone, Default, Debug, PartialEq, Eq)]
pub struct Count {
    value: isize,
}
// ANCHOR_END: model

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct ViewModel {
    pub count: isize,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum Event {
    StartWatch,
    StopWatch,
    Increment,
    Decrement,

    #[serde(skip)]
    Incremement10,
}

#[derive(Clone, Serialize, Deserialize, Debug, PartialEq, Eq)]
pub enum StreamOperation {
    Start,
    Stop,
}

#[derive(Serialize, Deserialize, Debug, PartialEq, Eq)]
pub enum StreamReponse {
    Data(String),
    End,
}

impl Operation for StreamOperation {
    type Output = StreamReponse;
}

#[effect]
pub enum Effect {
    Render(RenderOperation),
    Stream(StreamOperation),
}

#[derive(Default)]
pub struct App;

impl crux_core::App for App {
    type Model = Model;
    type Event = Event;
    type ViewModel = ViewModel;
    type Capabilities = ();
    type Effect = Effect;

    fn update(&self, msg: Event, model: &mut Model, _caps: &()) -> Command<Effect, Event> {
        match msg {
            Event::StartWatch => Command::new(|ctx| async move {
                let mut stream = ctx.stream_from_shell(StreamOperation::Start);
                while let Some(_) = stream.next().await {
                    ctx.send_event(Event::Incremement10);
                }
            }),
            Event::StopWatch => Command::notify_shell(StreamOperation::Stop).into(),
            Event::Increment => {
                model.count = Count {
                    value: model.count.value + 1,
                };
                render()
            }
            Event::Decrement => {
                model.count = Count {
                    value: model.count.value - 1,
                };
                render()
            }

            Event::Incremement10 => {
                model.count = Count {
                    value: model.count.value + 10,
                };
                render()
            }
        }
    }

    fn view(&self, model: &Self::Model) -> Self::ViewModel {
        Self::ViewModel {
            count: model.count.value,
        }
    }
}
